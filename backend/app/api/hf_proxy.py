# backend/app/api/hf_proxy.py

import requests
import os
import time
import json
from flask import request, jsonify, Blueprint

hf_proxy_bp = Blueprint('hf_proxy', __name__)

HF_URL = (
    'https://router.huggingface.co/hf-inference/models/'
    'sentence-transformers/all-roberta-large-v1/pipeline/feature-extraction'
)


@hf_proxy_bp.route('/hf-embed', methods=['POST', 'OPTIONS'])
def hf_embed():
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    # Check token
    hf_token = os.environ.get('HF_TOKEN')
    if not hf_token:
        return jsonify({'error': 'HF_TOKEN not set on server'}), 500

    # Parse request body — force=True handles missing Content-Type header
    data = request.get_json(force=True, silent=True)
    if data is None:
        try:
            data = json.loads(request.data.decode('utf-8'))
        except Exception:
            pass

    if not data:
        return jsonify({'error': 'Could not parse request body as JSON'}), 400

    inputs = data.get('inputs')
    if not inputs or not isinstance(inputs, list) or len(inputs) != 2:
        return jsonify({'error': 'inputs must be a list of exactly 2 strings'}), 400

    headers = {
        'Authorization': f'Bearer {hf_token}',
        'Content-Type': 'application/json',
    }
    payload = {
        'inputs': inputs,
        'options': {'wait_for_model': True},
    }

    # Retry up to 3 times — HF free tier returns 503 while model warms up
    last_status = 503
    last_body = {}

    for attempt in range(3):
        try:
            resp = requests.post(HF_URL, headers=headers, json=payload, timeout=60)
            last_status = resp.status_code
            last_body = resp.json()

            if resp.status_code == 503:
                # Model still loading — wait then retry
                estimated_wait = int(resp.headers.get('X-Wait-For-Model', 20))
                time.sleep(min(estimated_wait, 20))
                continue

            # Any other response (200 or error) — return immediately
            return jsonify(last_body), last_status

        except requests.exceptions.Timeout:
            last_body = {'error': f'HuggingFace timed out on attempt {attempt + 1}'}
            last_status = 504
            time.sleep(5)
            continue

        except Exception as e:
            return jsonify({'error': str(e)}), 502

    # All retries exhausted
    return jsonify(last_body), last_status
