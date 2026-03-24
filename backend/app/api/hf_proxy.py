# backend/app/api/hf_proxy.py
#
# Two endpoints:
#   POST /hf-embed    — sentence embeddings  (Path 1: similarity scoring)
#   POST /hf-classify — ZSL classification   (Path 2: per-dimension STAR scoring)

import json
import traceback
import threading
from flask import request, jsonify, Blueprint

hf_proxy_bp = Blueprint('hf_proxy', __name__)

# ── Embedding model (Path 1: all-roberta-large-v1) ───────────────────────────
_model = None

def _prewarm_model():
    """Pre-warm the embedding model so the first request isn't slow."""
    get_model()

def get_model():
    global _model
    if _model is None:
        try:
            print("Loading all-roberta-large-v1...", flush=True)
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer(
                'sentence-transformers/all-roberta-large-v1',
                device='cpu'
            )
            print("Model loaded successfully.", flush=True)
        except Exception as e:
            print(f"FAILED to load embedding model: {e}", flush=True)
            traceback.print_exc()
            return None
    return _model

# ── ZSL Classification model (Path 2: cross-encoder/nli-roberta-base) ─────────
_classify_model = None

def _prewarm_classify_model():
    """Pre-warm the ZSL model so the first classify request isn't slow."""
    get_classify_model()

def get_classify_model():
    global _classify_model
    if _classify_model is None:
        try:
            print("Loading cross-encoder/nli-roberta-base for ZSL...", flush=True)
            from transformers import pipeline
            _classify_model = pipeline(
                'zero-shot-classification',
                model='cross-encoder/nli-roberta-base',
                device=-1  # CPU
            )
            print("ZSL classification model loaded successfully.", flush=True)
        except Exception as e:
            print(f"FAILED to load ZSL model: {e}", flush=True)
            traceback.print_exc()
            return None
    return _classify_model

def prewarm_all():
    """
    Called once at app startup (via threading.Thread) to warm both models
    in parallel so neither the embed nor classify endpoint is slow on first hit.
    """
    t1 = threading.Thread(target=_prewarm_model,          daemon=True)
    t2 = threading.Thread(target=_prewarm_classify_model, daemon=True)
    t1.start()
    t2.start()

# ── /hf-embed (Path 1) ──────────────────────────────────────────────────────
@hf_proxy_bp.route('/hf-embed', methods=['POST'])
def hf_embed():

    data = request.get_json(force=True, silent=True)
    if data is None:
        try:
            data = json.loads(request.data.decode('utf-8'))
        except Exception:
            return jsonify({'error': 'Could not parse request body as JSON'}), 400

    inputs = data.get('inputs')
    if not inputs or not isinstance(inputs, list) or len(inputs) < 1:
        return jsonify({'error': 'inputs must be a list of 1 or more strings'}), 400

    model = get_model()
    if model is None:
        return jsonify({'error': 'Model failed to load — check Railway deploy logs'}), 500

    try:
        embeddings = model.encode(inputs, convert_to_numpy=True)
        return jsonify(embeddings.tolist()), 200
    except Exception as e:
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

# ── /hf-classify (Path 2: ZSL per STAR dimension) ───────────────────────────
# cross-encoder/nli-roberta-base has a hard limit of 512 tokens.
# The NLI pipeline internally formats each call as:
#   "[CLS] <premise> [SEP] <hypothesis> [SEP]"
# where hypothesis is one candidate label at a time.
# A safe premise length is ~350 chars (~87 tokens), leaving room for the
# longest label (~15 tokens) + special tokens + template overhead.
_MAX_CLASSIFY_INPUT_CHARS = 350

@hf_proxy_bp.route('/hf-classify', methods=['POST'])
def hf_classify():

    data = request.get_json(force=True, silent=True)
    if data is None:
        try:
            data = json.loads(request.data.decode('utf-8'))
        except Exception:
            return jsonify({'error': 'Could not parse request body as JSON'}), 400

    inputs = data.get('inputs')
    candidate_labels = data.get('candidate_labels')

    if not inputs or not isinstance(inputs, str):
        return jsonify({'error': 'inputs must be a string'}), 400
    if not candidate_labels or not isinstance(candidate_labels, list):
        return jsonify({'error': 'candidate_labels must be a list'}), 400

    # Truncate before hitting the model — prevents token-overflow 500s on long answers.
    safe_inputs = inputs[:_MAX_CLASSIFY_INPUT_CHARS]

    classifier = get_classify_model()
    if classifier is None:
        return jsonify({'error': 'ZSL model failed to load'}), 500

    try:
        result = classifier(safe_inputs, candidate_labels, multi_label=False)
        return jsonify({
            'labels': result['labels'],
            'scores': result['scores'],
        }), 200
    except Exception as e:
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500