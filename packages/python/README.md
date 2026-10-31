# playpen-connector (Python)

Python client, `playpen` CLI, `playpen-mcp` MCP server and RAG connector for the
[Moss Piglets Play Pen](https://github.com/biobitworks/moss-piglets-play-pen) knowledge graph.
No dependencies beyond the standard library, and no API key needed: `ask` uses a local model
(Ollama by default) and falls back to graph-only answers.

```bash
pip install "git+https://github.com/biobitworks/moss-piglets-play-pen#subdirectory=packages/python"
export PLAYPEN_URL=http://localhost:3000   # where the Play Pen app runs
playpen status
playpen search trace neurons in EM
playpen ask "what still needs building for the tardigrade?" --model qwen2.5-coder:7b
```

```python
from playpen import PlayPen, RAG, OpenAICompatible
pp = PlayPen()
pp.search("synapse detection")
RAG(pp, OpenAICompatible(model="qwen2.5-coder:7b")).ask("Which tool reads FlyWire?")
```

See the repo README for the MCP setup and the other packages (Node CLI, R).
