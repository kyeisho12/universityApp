# backend/app/api/hf_proxy.py
import json
import logging
import traceback
from flask import request, jsonify, Blueprint
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)
hf_proxy_bp = Blueprint('hf_proxy', __name__)

model = None

def get_model():
    global model
    if model is None:
        try:
            logger.info("Loading all-roberta-large-v1...")
            model = SentenceTransformer('sentence-transformers/all-roberta-large-v1')
            logger.info("all-roberta-large-v1 loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            model = None
    return model

@hf_proxy_bp.route('/hf-embed', methods=['POST', 'OPTIONS'])
def hf_embed():
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    loaded_model = get_model()
    if loaded_model is None:
        return jsonify({'error': 'Model failed to load on server startup'}), 500

    data = request.get_json(force=True, silent=True)
    if data is None:
        try:
            data = json.loads(request.data.decode('utf-8'))
        except Exception:
            return jsonify({'error': 'Could not parse request body as JSON'}), 400

    inputs = data.get('inputs')
    if not inputs or not isinstance(inputs, list) or len(inputs) != 2:
        return jsonify({'error': 'inputs must be a list of exactly 2 strings'}), 400

    try:
        embeddings = loaded_model.encode(inputs, convert_to_list=True)
        return jsonify(embeddings), 200
    except Exception as e:
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500