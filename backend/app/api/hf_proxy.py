import requests
import os
from flask import request, jsonify, Blueprint

hf_proxy_bp = Blueprint('hf_proxy', __name__)

@hf_proxy_bp.route('/hf-embed', methods=['POST'])
def hf_embed():
    hf_token = os.environ.get('HF_TOKEN')
    if not hf_token:
        return jsonify({'error': 'HF_TOKEN not set on server'}), 500

    data = request.get_json()
    if not data or 'inputs' not in data:
        return jsonify({'error': 'Missing inputs field'}), 400

    inputs = data.get('inputs')
    if not isinstance(inputs, list) or len(inputs) != 2:
        return jsonify({'error': 'inputs must be an array of exactly two strings'}), 400
    if not all(isinstance(item, str) and item.strip() for item in inputs):
        return jsonify({'error': 'inputs must contain non-empty strings'}), 400

    # Force feature-extraction pipeline to return embeddings for both input texts.
    # This matches frontend logic which computes cosine similarity client-side.
    hf_url = (
        'https://router.huggingface.co/hf-inference/pipeline/feature-extraction/'
        'sentence-transformers/all-roberta-large-v1'
    )

    try:
        resp = requests.post(
            hf_url,
            headers={
                'Authorization': f'Bearer {hf_token}',
                'Content-Type': 'application/json',
            },
            json={
                'inputs': inputs,
                'options': {'wait_for_model': True},
            },
            timeout=20,
        )

        payload = resp.json() if resp.text else {}
        if resp.status_code >= 400:
            return jsonify({'error': payload.get('error') if isinstance(payload, dict) else payload}), resp.status_code

        return jsonify(payload), resp.status_code

    except requests.exceptions.Timeout:
        return jsonify({'error': 'HuggingFace timed out'}), 504
    except Exception as e:
        return jsonify({'error': str(e)}), 502