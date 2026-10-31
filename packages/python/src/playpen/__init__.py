"""Connector for the Moss Piglets Play Pen knowledge graph.

    from playpen import PlayPen, RAG
    pp = PlayPen()                      # PLAYPEN_URL or http://localhost:3000
    pp.search("trace neurons in EM")    # vector search over the graph
    RAG(pp).ask("What still needs building for the tardigrade?")
"""
from .client import PlayPen, PlayPenError
from .rag import RAG, LLM, OpenAICompatible, Anthropic, local_llm

__version__ = "0.1.0"
__all__ = ["PlayPen", "PlayPenError", "RAG", "LLM", "OpenAICompatible", "Anthropic", "local_llm", "__version__"]
