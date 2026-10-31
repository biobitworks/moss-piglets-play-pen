# playpen (R)

R connector for the Moss Piglets Play Pen knowledge graph. Needs a running Play Pen server
(`PLAYPEN_URL`, default `http://localhost:3000`). No API key: `pp_ask()` uses a local model
through Ollama by default and falls back to graph-only answers.

```r
# install.packages("remotes")
remotes::install_github("biobitworks/moss-piglets-play-pen", subdir = "packages/r")
library(playpen)
pp_connect("http://localhost:3000")
pp_search("synapse detection")
pp_node("fcg:tool/natverse")
pp_ask("What still needs building for the tardigrade?", llm = pp_local_llm("qwen2.5-coder:7b"))
```
