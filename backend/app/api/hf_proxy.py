# backend/app/api/hf_proxy.py
import json
import logging
import traceback
from flask import request, jsonify, Blueprint

logger = logging.getLogger(__name__)
hf_proxy_bp = Blueprint('hf_proxy', __name__)

# Load model lazily on first request instead of at startup
# This prevents gunicorn worker from dying during boot
_model = None

def get_model():
    global _model
    if _model is None:
        try:
            logger.info("Loading all-roberta-large-v1...")
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer('sentence-transformers/all-roberta-large-v1')
            logger.info("Model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
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
        return jsonify({'error': 'Model failed to load'}), 500

    try:
        embeddings = model.encode(inputs, convert_to_list=True)
        return jsonify(embeddings), 200
    except Exception as e:
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500