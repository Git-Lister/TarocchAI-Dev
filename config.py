import os

MODEL_NAME = os.getenv("TAROT_MODEL", "llama3.1:8b-instruct-q6_K")
DEFAULT_SPREAD = "past_present_future"
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
# for Docker: set OLLAMA_URL=http://host.docker.internal:11434
