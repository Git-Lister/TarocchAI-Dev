"""
LLM client abstraction – supports Ollama (local) and Groq (cloud).
Set LLM_BACKEND in config.py or via TAROCCHAI_LLM_BACKEND env var.
"""

import os

from ollama import AsyncClient as OllamaClient

from config import LLM_BACKEND, MODEL_NAME, OLLAMA_URL

_GROQ_CLIENT = None

def _groq_client():
    global _GROQ_CLIENT
    if _GROQ_CLIENT is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY environment variable not set")
        from groq import AsyncGroq
        _GROQ_CLIENT = AsyncGroq(api_key=api_key)
    return _GROQ_CLIENT

async def chat(messages: list, stream: bool = False):
    """
    Send a chat completion request to the configured LLM backend.
    Returns the full response string (if stream=False) or an async generator (if stream=True).
    """
    if LLM_BACKEND == "groq":
        client = _groq_client()
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            temperature=0.9,          # matched to Oracle tone
            max_tokens=2048,
            stream=stream,
        )
        if stream:
            async def _groq_stream():
                async for chunk in response:
                    content = chunk.choices[0].delta.content
                    if content:
                        yield content
            return _groq_stream()
        else:
            return response.choices[0].message.content
    else:  # ollama
        client = OllamaClient(host=OLLAMA_URL)
        if stream:
            # Ollama's async chat stream returns an async iterator that yields {"message": {"content": ...}}
            ollama_stream = await client.chat(
                model=MODEL_NAME,
                messages=messages,
                stream=True,
            )
            async def _ollama_stream():
                async for chunk in ollama_stream:
                    yield chunk.get("message", {}).get("content", "")
            return _ollama_stream()
        else:
            resp = await client.chat(
                model=MODEL_NAME,
                messages=messages,
                stream=False,
            )
            return resp["message"]["content"]