"""
A simple async queue that ensures only one LLM call runs at a time.
Others wait gracefully. Safe for asyncio (single-threaded).
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
            # Set _busy BEFORE creating the task so a second submit arriving
            # before _process starts does not spawn a duplicate processor.
            self._busy = True
            asyncio.create_task(self._process())
        return await fut

    async def _process(self):
        while self._queue:
            coro, fut = self._queue.popleft()
            try:
                result = await coro
                fut.set_result(result)
            except Exception as e: # noqa: BLE001
                fut.set_exception(e)
        self._busy = False

    @property
    def is_busy(self):
        return self._busy


# Singleton
ollama_queue = OllamaQueue()
