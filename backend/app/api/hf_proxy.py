# backend/app/api/hf_proxy.py
#
# Runs sentence-transformers/all-roberta-large-v1 directly on the server.
# No external API calls — model loads once on startup, stays in memory.
# Requires ~2GB RAM — Railway Starter plan handles this fine.

import json
import logging
from flask import request, jsonify, Blueprint
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)
hf_proxy_bp = Blueprint('hf_proxy', __name__)

# Loads once when gunicorn worker starts — stays in memory for all requests
logger.info("Loading all-roberta-large-v1...")
model = SentenceTransformer('sentence-transformers/all-roberta-large-v1')
logger.info("all-roberta-large-v1 loaded successfully.")


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

    try:
        # encode() returns two embedding vectors: [[...], [...]]
        embeddings = model.encode(inputs, convert_to_list=True)
        return jsonify(embeddings), 200
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        return jsonify({'error': str(e)}), 502