import { expect, it } from "vitest"
import { runPipeline } from "../src/pipeline"

it("exports the assignment public API from src/pipeline", () => {
  expect(runPipeline).toBeTypeOf("function")
})
