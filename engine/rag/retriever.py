"""
Retrieve relevant tarot knowledge for a given set of card IDs.
"""

import os

import chromadb
from chromadb.utils import embedding_functions

VECTORS_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "vectors")

# Reuse the same embedding function as for indexing
ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

_client = None
_collection = None

def _get_collection():
    global _client, _collection
    if _client is None:
        _client = chromadb.PersistentClient(path=VECTORS_PATH)
        _collection = _client.get_collection(
            name="tarot_knowledge",
            embedding_function=ef,
        )
    return _collection

def retrieve_card_context(card_ids: list, n_results: int = 5) -> str:
    """
    Fetch the full documents for the given card IDs, limited to n_results per card.
    Returns a concatenated string of card meanings.
    """
    if not card_ids:
        return ""

    collection = _get_collection()
    results = collection.get(ids=card_ids, include=["documents"])
    if results and results["documents"]:
        # Each item is a document string
        return "\n\n---\n\n".join(results["documents"])
    return ""