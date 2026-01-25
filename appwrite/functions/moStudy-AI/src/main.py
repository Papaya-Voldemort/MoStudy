import os
import json
from openrouter import OpenRouter

def main(context):
    """
    Appwrite Function to proxy requests to OpenRouter via Hack Club API.
    """
    req = context.req
    res = context.res
    log = context.log
    error = context.error

    if req.method != 'POST':
        return res.json({'error': 'Please send a POST request'}, 405)

    log('=== moStudy-AI Proxy Starting (Python) ===')

    api_key = os.environ.get('OPENROUTER_API_KEY')
    if not api_key:
        error('Missing OPENROUTER_API_KEY')
        return res.json({'error': 'AI Service Config Error'}, 500)

    try:
        body = req.body
        if isinstance(body, str) and body:
            payload = json.loads(body)
        elif isinstance(body, dict):
            payload = body
        else:
            payload = {}
    except Exception as e:
        error(f'Payload parse error: {e}')
        return res.json({'error': 'Invalid JSON'}, 400)

    messages = payload.get('messages')
    if not messages:
        return res.json({'error': 'Messages required'}, 400)

    model = payload.get('model', 'google/gemini-3-flash-preview')
    
    log(f'Calling Hack Club AI Proxy | Model: {model}')

    try:
        client = OpenRouter(
            api_key=api_key,
            server_url="https://ai.hackclub.com/proxy/v1"
        )
        
        args = {
            "model": model,
            "messages": messages,
            "stream": False,
            "temperature": payload.get('temperature', 0.7)
        }
        
        if 'response_format' in payload:
            args['response_format'] = payload['response_format']
        if 'max_tokens' in payload:
            args['max_tokens'] = payload['max_tokens']
        if 'top_p' in payload:
            args['top_p'] = payload['top_p']

        completion = client.chat.send(**args)
        
        # Serialize response
        if hasattr(completion, 'model_dump'):
            data = completion.model_dump()
        elif hasattr(completion, 'dict'):
            data = completion.dict()
        else:
            data = completion

        return res.json(data)

    except Exception as err:
        error(f'OpenRouter Error: {str(err)}')
        return res.json({'error': str(err)}, 500)
