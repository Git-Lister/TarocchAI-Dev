"""
A simple async queue that ensures only one LLM call runs at a time.
Others wait gracefully. Thread‑safe for asyncio.
"""

import asyncio
from collections import deque


class OllamaQueue:
    def __init__(self):
        self._queue = deque()
        self._busy = False

    async def submit(self, coro):
        """Queue an async coroutine; returns its result when executed."""
        fut = asyncio.Future()
        self._queue.append((coro, fut))
        if not self._busy:
            asyncio.create_task(self._process())
        return await fut

    async def _process(self):
        while self._queue:
            self._busy = True
            coro, fut = self._queue.popleft()
            try:
                result = await coro
                fut.set_result(result)
            except Exception as e:
                fut.set_exception(e)
        self._busy = False

    @property
    def is_busy(self):
        return self._busy

# Singleton
ollama_queue = OllamaQueue()