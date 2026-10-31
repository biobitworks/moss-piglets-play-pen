.pp <- new.env(parent = emptyenv())

#' Set or read the Play Pen server URL (default PLAYPEN_URL or http://localhost:3000)
pp_connect <- function(url = NULL) {
  .pp$url <- sub("/+$", "", url %||% Sys.getenv("PLAYPEN_URL", "http://localhost:3000"))
  invisible(.pp$url)
}
pp_url <- function() .pp$url %||% pp_connect()

`%||%` <- function(a, b) if (is.null(a) || (length(a) == 1 && identical(a, ""))) b else a

.drop_null <- function(x) x[!vapply(x, is.null, logical(1))]

.http <- function(method, url, body = NULL, query = NULL, headers = list(), timeout = 30) {
  if (length(query)) {
    query <- .drop_null(query)
    if (length(query)) url <- paste0(url, "?", paste0(names(query), "=", vapply(query, function(v) curl::curl_escape(as.character(v)), ""), collapse = "&"))
  }
  h <- curl::new_handle(timeout = timeout)
  hdr <- c(list(accept = "application/json"), headers)
  if (!is.null(body)) {
    hdr[["content-type"]] <- "application/json"
    curl::handle_setopt(h, customrequest = method, postfields = jsonlite::toJSON(body, auto_unbox = TRUE, null = "null"))
  } else if (method != "GET") {
    curl::handle_setopt(h, customrequest = method)
  }
  do.call(curl::handle_setheaders, c(list(h), hdr))
  res <- curl::curl_fetch_memory(url, handle = h)
  txt <- rawToChar(res$content)
  Encoding(txt) <- "UTF-8"
  data <- if (nzchar(txt)) tryCatch(jsonlite::fromJSON(txt, simplifyVector = FALSE), error = function(e) txt) else NULL
  if (res$status_code >= 400) {
    msg <- if (is.list(data) && !is.null(data$error)) data$error else substr(txt, 1, 200)
    stop(sprintf("HTTP %d from %s: %s", res$status_code, url, msg), call. = FALSE)
  }
  data
}

#' Is the server reachable?
pp_ping <- function() isTRUE(tryCatch({ .http("GET", paste0(pp_url(), "/api/tools"), timeout = 5); TRUE }, error = function(e) FALSE))

#' Tool definitions the server offers
pp_tools <- function() .http("GET", paste0(pp_url(), "/api/tools"))$tools

#' Call any tool by name, e.g. pp_call("kg_search", query = "navis", k = 3)
pp_call <- function(.tool, ...) {
  args <- .drop_null(list(...))
  if (!length(args)) args <- structure(list(), names = character(0))
  out <- tryCatch(.http("POST", paste0(pp_url(), "/api/tools/", .tool), body = args),
                  error = function(e) stop(sub("^HTTP [0-9]+ from \\S+: ", "", conditionMessage(e)), call. = FALSE))
  if (!is.null(out$error)) stop(out$error, call. = FALSE)
  out$result
}

.rows <- function(x, cols) {
  if (!length(x)) return(as.data.frame(setNames(replicate(length(cols), character(0), simplify = FALSE), cols)))
  do.call(rbind, lapply(x, function(n) as.data.frame(lapply(setNames(cols, cols), function(k) {
    v <- n[[k]]; if (is.null(v)) NA else if (is.list(v)) paste(unlist(v), collapse = ", ") else v
  }), stringsAsFactors = FALSE)))
}

#' Vector search over the graph; returns a data frame of hits
pp_search <- function(query, k = 8, type = NULL, status = NULL, raw = FALSE) {
  hits <- pp_call("kg_search", query = query, k = k, type = type, status = status)
  if (raw) hits else .rows(hits, c("id", "type", "label", "status", "score", "description"))
}

#' One node by address (fcg:tool/navis) with its links
pp_node <- function(id) pp_call("kg_get_node", id = id)

#' Nodes of one type as a data frame
pp_list <- function(type, status = NULL) .rows(pp_call("kg_list", type = type, status = status), c("id", "type", "label", "status", "description"))

#' What is built and what is still needed
pp_status <- function(type = NULL) pp_call("kg_status", type = type)

#' Timestamped proof of work
pp_worklog <- function(limit = 20) pp_call("kg_worklog", limit = limit)

pp_add_node <- function(type, label, status = NULL, description = NULL, slug = NULL)
  pp_call("kg_add_node", type = type, label = label, status = status, description = description, slug = slug)

pp_add_edge <- function(from, type, to) pp_call("kg_add_edge", from = from, type = type, to = to)

pp_register_agent <- function(name, description = NULL, capabilities = character(0), topics = character(0), endpoint = NULL)
  pp_call("agent_register", name = name, description = description, capabilities = I(capabilities), topics = I(topics), endpoint = endpoint)

#' Send a message: to = "a" (1:1), to = c("a","b") (1:many) or topic = "t" (many:many)
pp_send <- function(from, body, to = NULL, topic = NULL, about = NULL) {
  if (length(to) > 1) to <- I(to)
  pp_call("agent_send", from = from, body = body, to = to, topic = topic, about = if (is.null(about)) NULL else I(about))
}

pp_subscribe <- function(agent, topic) pp_call("agent_subscribe", agent = agent, topic = topic)
pp_inbox <- function(agent = NULL, topic = NULL, since = NULL) pp_call("agent_inbox", agent = agent, topic = topic, since = since)
pp_agents <- function() pp_call("agent_list")

#' Chat backends on the server (claude, local, search)
pp_backends <- function() .http("GET", paste0(pp_url(), "/api/chat"))

#' Ask the server's own chat endpoint
pp_chat <- function(message, backend = NULL, model = NULL, history = list()) {
  body <- .drop_null(list(messages = c(history, list(list(role = "user", content = message))), backend = backend, model = model))
  .http("POST", paste0(pp_url(), "/api/chat"), body = body, timeout = 180)
}
