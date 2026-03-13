# backend/app/api/hf_proxy.py

import requests
import os
from flask import request, jsonify, Blueprint, current_app, Response
import logging

hf_proxy_bp = Blueprint('hf_proxy', __name__)

@hf_proxy_bp.route('/hf-embed', methods=['POST', 'OPTIONS'])
def hf_embed():
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    hf_token = os.environ.get('HF_TOKEN')
    if not hf_token:
        try:
            current_app.logger.error('HF_TOKEN not set on server')
        except Exception:
            logging.error('HF_TOKEN not set on server')
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

        # Try to return JSON if possible, otherwise return raw text
        try:
            return jsonify(resp.json()), resp.status_code
        except ValueError:
            return Response(resp.content, status=resp.status_code, content_type=resp.headers.get('Content-Type', 'text/plain'))

    except requests.exceptions.Timeout:
        try:
            current_app.logger.warning('HuggingFace inference request timed out')
        except Exception:
            logging.warning('HuggingFace inference request timed out')
        return jsonify({'error': 'HuggingFace timed out'}), 504
    except Exception as e:
        try:
            current_app.logger.exception('Error proxying to HuggingFace: %s', e)
        except Exception:
            logging.exception('Error proxying to HuggingFace: %s', e)
        return jsonify({'error': 'Failed to proxy request to HuggingFace'}), 502