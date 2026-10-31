.SYSTEM <- paste(
  "You answer questions about the Moss Piglets Play Pen: what exists for the fly connectome and what is built or",
  "still needed to finish the tardigrade connectome (Tardimap). Use only the context nodes given. Cite nodes by",
  "their address in backticks, like `fcg:tool/navis`. If the context does not say, say so.")

#' A local model through any OpenAI-compatible server (Ollama by default). No API key.
#' For a frontier model later, pass url, model and api_key of any OpenAI-compatible API.
pp_local_llm <- function(model = NULL, url = NULL, api_key = NULL) {
  url <- sub("/+$", "", url %||% Sys.getenv("PLAYPEN_LOCAL_URL", "http://localhost:11434/v1"))
  model <- model %||% Sys.getenv("PLAYPEN_LOCAL_MODEL", "llama3.1:8b")
  api_key <- api_key %||% Sys.getenv("PLAYPEN_LOCAL_API_KEY", "")
  headers <- if (nzchar(api_key)) list(authorization = paste("Bearer", api_key)) else list()
  structure(list(
    name = "openai-compatible", model = model, url = url,
    available = function() isTRUE(tryCatch({ .http("GET", paste0(url, "/models"), headers = headers, timeout = 3); TRUE }, error = function(e) FALSE)),
    complete = function(messages) {
      out <- .http("POST", paste0(url, "/chat/completions"), headers = headers, timeout = 180,
                   body = list(model = model, messages = messages, temperature = 0.2, stream = FALSE))
      trimws(out$choices[[1]]$message$content %||% "")
    }
  ), class = "pp_llm")
}

#' Retrieve graph nodes for a question (search, then expand the top few with their links)
pp_retrieve <- function(question, k = 6, expand = 3) {
  hits <- pp_search(question, k = k, raw = TRUE)
  for (i in seq_len(min(expand, length(hits)))) {
    full <- tryCatch(pp_node(hits[[i]]$id), error = function(e) NULL)
    if (!is.null(full)) { hits[[i]]$links <- full$links; hits[[i]]$props <- full$props }
  }
  hits
}

#' Context text for a list of retrieved nodes
pp_context <- function(hits) {
  blocks <- vapply(hits, function(n) {
    lines <- sprintf("[%s] %s (type %s, status %s)", n$id, n$label %||% "", n$type %||% "", n$status %||% "n/a")
    if (!is.null(n$description)) lines <- c(lines, n$description)
    for (key in c("install", "docs", "url", "language")) if (!is.null(n$props[[key]])) lines <- c(lines, paste0(key, ": ", n$props[[key]]))
    for (e in utils::head(n$links, 12)) lines <- c(lines, trimws(sprintf("  %s %s %s %s", if (identical(e$direction, "out")) "->" else "<-", e$edge, e$node$id %||% "", e$node$label %||% ""), "right"))
    paste(lines, collapse = "\n")
  }, "")
  paste(blocks, collapse = "\n\n")
}

.graph_answer <- function(question, hits, why = "") {
  pre <- if (nzchar(why)) paste0(why, " ") else ""
  if (!length(hits)) return(paste0(pre, "Nothing in the graph matched that."))
  rows <- vapply(hits, function(h) sprintf("- `%s` %s (%s)%s", h$id, h$label %||% "", h$status %||% "n/a",
                                          if (is.null(h$description)) "" else paste0(": ", h$description)), "")
  paste(c(sprintf("%sClosest matches in the graph for \"%s\":", pre, question), rows), collapse = "\n")
}

#' RAG: retrieve from the graph, answer with a local model (default) or graph-only.
#' llm: pp_local_llm(...), "search" for graph-only, or a function(messages) returning text.
pp_ask <- function(question, llm = pp_local_llm(), k = 6) {
  hits <- pp_retrieve(question, k = k)
  sources <- vapply(hits, function(h) h$id, "")
  if (identical(llm, "search") || is.null(llm))
    return(list(answer = .graph_answer(question, hits), backend = "search", model = NULL, sources = sources))
  if (is.function(llm)) llm <- structure(list(name = "custom", model = NULL, available = function() TRUE, complete = llm), class = "pp_llm")
  if (!llm$available()) {
    why <- sprintf("No model reachable (%s %s).", llm$name, llm$url %||% "")
    return(list(answer = .graph_answer(question, hits, why), backend = "search", model = NULL, sources = sources, note = why))
  }
  msgs <- list(list(role = "system", content = .SYSTEM),
               list(role = "user", content = paste0("Context nodes:\n\n", pp_context(hits), "\n\nQuestion: ", question)))
  ans <- tryCatch(llm$complete(msgs), error = function(e) e)
  if (inherits(ans, "error"))
    return(list(answer = .graph_answer(question, hits, paste0("The model failed (", conditionMessage(ans), ").")),
                backend = "search", model = NULL, sources = sources, error = conditionMessage(ans)))
  list(answer = ans, backend = llm$name, model = llm$model, sources = sources)
}
