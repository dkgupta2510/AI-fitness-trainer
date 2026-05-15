import os
from groq import Groq

DEFAULT_MODEL = os.getenv('GROQ_MODEL', 'llama-3.3-70b-versatile')


def get_api_key():
    api_key = os.getenv('GROQ_API_KEY') or os.getenv('ANTHROPIC_API_KEY')
    if not api_key or api_key.startswith('your_'):
        raise ValueError('Set GROQ_API_KEY in backend/.env')
    return api_key


def get_client():
    return Groq(api_key=get_api_key())


def chat(prompt, max_tokens=2000):
    client = get_client()
    response = client.chat.completions.create(
        model=DEFAULT_MODEL,
        messages=[{'role': 'user', 'content': prompt}],
        max_tokens=max_tokens,
        temperature=0.7,
    )
    return response.choices[0].message.content
