import { ESLint } from "eslint"
import { describe, expect, it } from "vitest"

const eslint = new ESLint({ cwd: process.cwd() })

const lint = async (source: string) => {
  const [result] = await eslint.lintText(source, { filePath: "src/fixture.ts" })
  return result?.messages ?? []
}

const forbidden = [
  {
    name: "Promise.all",
    source: "export const result = Promise.all([])",
    message: "Promise.all 대신"
  },
  {
    name: "new Promise",
    source: "export const result = new Promise(() => undefined)",
    message: "new Promise 대신"
  },
  {
    name: "async function",
    source: "export const run = async () => 1",
    message: "async 함수 대신"
  },
  {
    name: "await",
    source: "export async function run() { return await Promise.resolve(1) }",
    message: "await 대신"
  },
  {
    name: "setTimeout",
    source: "export const timer = setTimeout(() => undefined, 1)",
    message: "setTimeout 대신"
  },
  {
    name: "fetch",
    source: "export const response = fetch('https://example.com')",
    message: "외부 HTTP I/O"
  },
  {
    name: "try/catch",
    source: "export function run() { try { return 1 } catch { return 0 } }",
    message: "try/catch 대신"
  },
  {
    name: "throw",
    source: "export function run() { throw new Error('boom') }",
    message: "throw 대신"
  },
  {
    name: "Array.push",
    source: "export const run = (values: number[]) => values.push(1)",
    message: "mutable push 대신"
  },
  {
    name: "as any",
    source: "export const value = 1 as any",
    message: "as any로"
  },
  {
    name: "module let",
    source: "export let count = 0",
    message: "module-level mutable state"
  },
  {
    name: "Effect.forkDaemon",
    source: "import { Effect } from 'effect'; export const value = Effect.forkDaemon(Effect.void)",
    message: "forkDaemon은"
  },
  {
    name: "Effect.orDie",
    source: "import { Effect } from 'effect'; export const value = Effect.orDie(Effect.void)",
    message: "orDie로"
  },
  {
    name: "curried Effect.orDie",
    source: "import { Effect } from 'effect'; export const value = Effect.void.pipe(Effect.orDie)",
    message: "orDie로"
  },
  {
    name: "Effect.catchAll",
    source: "import { Effect } from 'effect'; export const value = Effect.catchAll(Effect.void, () => Effect.void)",
    message: "catchAll로"
  },
  {
    name: "Effect.runPromise",
    source: "import { Effect } from 'effect'; export const value = Effect.runPromise(Effect.void)",
    message: "별도 root Fiber"
  },
  {
    name: "Effect.runSync",
    source: "import { Effect } from 'effect'; export const value = Effect.runSync(Effect.void)",
    message: "별도 root Fiber"
  },
  {
    name: "Effect.runFork",
    source: "import { Effect } from 'effect'; export const value = Effect.runFork(Effect.void)",
    message: "별도 root Fiber"
  },
  {
    name: "Date.now",
    source: "export const now = Date.now()",
    message: "실제 시간 대신"
  },
  {
    name: "Math.random",
    source: "export const random = Math.random()",
    message: "비결정적 Math.random"
  },
  {
    name: "Context import",
    source: "import { Context } from 'effect'; export const Tag = Context.GenericTag<string>('Tag')",
    message: "Context/Layer/Queue/Stream/STM"
  },
  {
    name: "out-of-scope core imports",
    source: "import { Layer, Queue, STM, Stream } from 'effect'; export { Layer, Queue, STM, Stream }",
    message: "Context/Layer/Queue/Stream/STM"
  },
  {
    name: "@effect/platform import",
    source: "import { FileSystem } from '@effect/platform'; export { FileSystem }",
    message: "effect core package만"
  },
  {
    name: "Node I/O import",
    source: "import { readFile } from 'node:fs/promises'; export { readFile }",
    message: "OS/file/HTTP/process I/O"
  },
  {
    name: "console",
    source: "export const run = () => console.log('debug')",
    message: "Unexpected console statement"
  }
] as const

describe("exercise ESLint constraints", () => {
  for (const fixture of forbidden) {
    it(`rejects ${fixture.name}`, async () => {
      const messages = await lint(fixture.source)
      expect(messages.some((message) => message.message.includes(fixture.message))).toBe(true)
    })
  }

  it("accepts Effect.gen based core code", async () => {
    const messages = await lint(`
      import { Effect } from "effect"
      export const program = Effect.gen(function* () {
        yield* Effect.yieldNow()
        return 1
      })
    `)

    expect(messages).toEqual([])
  })
})
