"""
LLM client abstraction — Ollama only.
"""

import asyncio

from ollama import AsyncClient as OllamaClient

from config import MODEL_NAME, OLLAMA_URL

_OLLAMA_CLIENT = None


def _ollama_client():
    """Singleton Ollama client.

    Pins the host to 127.0.0.1 to avoid a Windows-specific race: `localhost`
    resolves to ::1 (IPv6) before 127.0.0.1, and Ollama binds only to IPv4.
    Two back-to-back calls (as in the two-stage reading path) can race on the
    first DNS lookup and fail the second with ConnectionError."""
    global _OLLAMA_CLIENT
    if _OLLAMA_CLIENT is None:
        url = OLLAMA_URL.replace("localhost", "127.0.0.1")
        _OLLAMA_CLIENT = OllamaClient(host=url)
    return _OLLAMA_CLIENT


async def _chat_with_retry(client, **kwargs):
    """Call client.chat with one retry on connection failure."""
    try:
        return await client.chat(**kwargs)
    except ConnectionError:
        await asyncio.sleep(0.5)
        return await client.chat(**kwargs)


async def chat(messages: list, stream: bool = False):
    """
    Send a chat completion request to Ollama.
    Returns the full response string (if stream=False) or an async generator
    (if stream=True).
    """
    client = _ollama_client()
    if stream:
        ollama_stream = await _chat_with_retry(
            client,
            model=MODEL_NAME,
            messages=messages,
            stream=True,
        )

        async def _ollama_stream():
            async for chunk in ollama_stream:
                yield chunk.get("message", {}).get("content", "")

        return _ollama_stream()
    else:
        resp = await _chat_with_retry(
            client,
            model=MODEL_NAME,
            messages=messages,
            stream=False,
        )
        return resp["message"]["content"]
