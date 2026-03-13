# backend/app/api/hf_proxy.py

import requests
import os
from flask import request, jsonify, Blueprint

hf_proxy_bp = Blueprint('hf_proxy', __name__)

@hf_proxy_bp.route('/hf-embed', methods=['POST', 'OPTIONS'])
def hf_embed():
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    hf_token = os.environ.get('HF_TOKEN')
    if not hf_token:
        return jsonify({'error': 'HF_TOKEN not set on server'}), 500

    # Try to parse JSON — handle cases where Content-Type might be missing
    data = None
    try:
        data = request.get_json(force=True, silent=True)
    except Exception:
        pass

    # Fallback: try reading raw body
    if data is None:
        try:
            import json
            data = json.loads(request.data.decode('utf-8'))
        except Exception:
            pass

    if not data:
        return jsonify({
            'error': 'Could not parse request body as JSON',
            'content_type': request.content_type,
            'body_length': len(request.data),
        }), 400

    if 'inputs' not in data:
        return jsonify({
            'error': 'Missing inputs field',
            'received_keys': list(data.keys()),
        }), 400

    inputs = data['inputs']
    if not isinstance(inputs, list) or len(inputs) != 2:
        return jsonify({
            'error': 'inputs must be a list of exactly 2 strings',
            'received': str(inputs)[:200],
        }), 400

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
                'inputs': inputs,
                'options': {'wait_for_model': True},
            },
            timeout=20,
        )
        return jsonify(resp.json()), resp.status_code

    except requests.exceptions.Timeout:
        return jsonify({'error': 'HuggingFace timed out'}), 504
    except Exception as e:
        return jsonify({'error': str(e)}), 502