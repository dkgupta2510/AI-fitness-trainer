import json
import os
from groq import Groq

DEFAULT_MODEL = os.getenv('GROQ_MODEL', 'llama-3.3-70b-versatile')
FALLBACK_MODELS = [
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'llama-3.1-8b-instant',
]


def get_api_key():
    api_key = os.getenv('GROQ_API_KEY') or os.getenv('ANTHROPIC_API_KEY')
    if not api_key or api_key.strip().startswith('your_'):
        return None
    return api_key.strip()


def get_client():
    api_key = get_api_key()
    if not api_key:
        raise ValueError(
            'GROQ_API_KEY is not set. Add your key from https://console.groq.com/ to backend/.env'
        )
    return Groq(api_key=api_key)


def parse_json_text(text):
    text = (text or '').strip()
    if not text:
        raise ValueError('Empty response from AI')

    if text.startswith('```'):
        parts = text.split('```')
        for part in parts:
            part = part.strip()
            if part.lower().startswith('json'):
                part = part[4:].strip()
            if part.startswith('{'):
                text = part
                break

    start = text.find('{')
    end = text.rfind('}')
    if start == -1 or end == -1:
        raise ValueError('No JSON object found in AI response')

    return json.loads(text[start:end + 1])


def chat(prompt, max_tokens=2000, json_mode=False):
    client = get_client()
    models = [DEFAULT_MODEL] + [m for m in FALLBACK_MODELS if m != DEFAULT_MODEL]
    last_error = None

    messages = [{'role': 'user', 'content': prompt}]
    if json_mode:
        messages = [
            {'role': 'system', 'content': 'You respond with valid JSON only. No markdown.'},
            {'role': 'user', 'content': prompt},
        ]

    for model in models:
        try:
            kwargs = {
                'model': model,
                'messages': messages,
                'max_tokens': max_tokens,
                'temperature': 0.5,
            }
            if json_mode:
                kwargs['response_format'] = {'type': 'json_object'}

            response = client.chat.completions.create(**kwargs)
            return response.choices[0].message.content
        except Exception as e:
            last_error = e
            if 'decommissioned' in str(e).lower() or 'not found' in str(e).lower():
                continue
            raise

    raise last_error or RuntimeError('All Groq models failed')


def chat_json(prompt, max_tokens=2000):
    text = chat(prompt, max_tokens=max_tokens, json_mode=True)
    return parse_json_text(text)
