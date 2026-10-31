test_that("context text includes address, install and links", {
  hits <- list(list(id = "fcg:tool/navis", label = "navis", type = "tool", status = "built",
                    description = "Python neuron analysis.", props = list(install = "pip install navis"),
                    links = list(list(edge = "serves", direction = "out", node = list(id = "fcg:stage/analysis", label = "Analysis")))))
  ctx <- pp_context(hits)
  expect_match(ctx, "[fcg:tool/navis] navis (type tool, status built)", fixed = TRUE)
  expect_match(ctx, "install: pip install navis", fixed = TRUE)
  expect_match(ctx, "-> serves fcg:stage/analysis Analysis", fixed = TRUE)
})

test_that("unreachable server and model are reported, not crashed", {
  old <- pp_connect("http://127.0.0.1:9")
  on.exit(pp_connect(Sys.getenv("PLAYPEN_URL", "http://localhost:3000")))
  expect_false(pp_ping())
  expect_false(pp_local_llm(url = "http://127.0.0.1:9/v1")$available())
})

test_that("pp_call takes a tool argument called name", {
  expect_identical(names(formals(pp_call))[1], ".tool")
})
