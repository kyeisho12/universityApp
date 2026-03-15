# backend/app/api/hf_proxy.py
import json
import traceback
from flask import request, jsonify, Blueprint

hf_proxy_bp = Blueprint('hf_proxy', __name__)

_model = None

def get_model():
    global _model
    if _model is None:
        try:
            print("Loading all-roberta-large-v1...", flush=True)
            # Import INSIDE the function — not at module level
            # This prevents startup crash when gunicorn loads the module
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer(
                'sentence-transformers/all-roberta-large-v1',
                device='cpu'
            )
            print("Model loaded successfully.", flush=True)
        except Exception as e:
            print(f"FAILED to load model: {e}", flush=True)
            traceback.print_exc()
            return None
    return _model


@hf_proxy_bp.route('/hf-embed', methods=['POST', 'OPTIONS'])
def hf_embed():
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    data = request.get_json(force=True, silent=True)
    if data is None:
        try:
            data = json.loads(request.data.decode('utf-8'))
        except Exception:
            return jsonify({'error': 'Could not parse request body as JSON'}), 400

    inputs = data.get('inputs')
    if not inputs or not isinstance(inputs, list) or len(inputs) != 2:
        return jsonify({'error': 'inputs must be a list of exactly 2 strings'}), 400

    model = get_model()
    if model is None:
        return jsonify({'error': 'Model failed to load — check Railway deploy logs'}), 500

    try:
        embeddings = model.encode(inputs, convert_to_numpy=False)
        return jsonify(embeddings), 200
    except Exception as e:
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500