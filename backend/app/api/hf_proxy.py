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

    hf_url = (
        'https://router.huggingface.co/hf-inference/models/'
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
                'inputs': data['inputs'],
                'options': {'wait_for_model': True},
            },
            timeout=20,
        )
        return jsonify(resp.json()), resp.status_code

    except requests.exceptions.Timeout:
        return jsonify({'error': 'HuggingFace timed out'}), 504
    except Exception as e:
        return jsonify({'error': str(e)}), 502