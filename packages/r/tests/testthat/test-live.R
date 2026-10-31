# Runs against a real Play Pen server when PLAYPEN_URL is reachable (e.g. `npm run dev`), else skips.
skip_if_no_server <- function() {
  pp_connect()
  if (!pp_ping()) skip(paste("no Play Pen server at", pp_url()))
}

test_that("search, node, status, tools", {
  skip_if_no_server()
  hits <- pp_search("trace neurons", k = 3)
  expect_s3_class(hits, "data.frame")
  expect_true(all(startsWith(hits$id, "fcg:")))
  n <- pp_node(hits$id[1])
  expect_equal(n$id, hits$id[1])
  expect_true(length(pp_status()$counts) > 0)
  expect_true("kg_search" %in% vapply(pp_tools(), function(t) t$name, ""))
})

test_that("ask falls back to the graph with no model, and uses a custom llm", {
  skip_if_no_server()
  r <- pp_ask("what still needs building?", llm = "search")
  expect_equal(r$backend, "search")
  expect_match(r$answer, "fcg:", fixed = TRUE)
  r2 <- pp_ask("what still needs building?", llm = function(m) paste("saw", nchar(m[[2]]$content)))
  expect_equal(r2$backend, "custom")
  expect_match(r2$answer, "^saw [0-9]+$")
})

test_that("agent messages: one-to-one and topic", {
  skip_if_no_server()
  if (identical(Sys.getenv("PLAYPEN_TEST_WRITES"), "")) skip("set PLAYPEN_TEST_WRITES=1 to test writes")
  pp_register_agent("r-test-agent", "R package test", capabilities = c("test"), topics = c("r-tests"))
  m <- pp_send("r-test-agent", "hello from R", to = "r-test-agent")
  expect_true(!is.null(m))
  expect_true(length(pp_inbox(agent = "r-test-agent")) > 0)
})
