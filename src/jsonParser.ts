import { jsonTransformStream } from './jsonTransformStream'

/**
 * Returns an async iterator that yields parsed JSON objects from a stream of JSON strings.
 * It can handle partial JSON data spread across multiple chunks.
 * It can handle multiple JSON objects in a single chunk.
 * It skips duplicate objects to avoid processing the same object multiple times.
 *
 * @returns An async iterator that yields parsed JSON objects.
 * @template T The expected type of the parsed JSON object(s). - this is not validated at runtime, but can be used for type hinting.
 * @example
 * ```ts
 * import { jsonStream } from './jsonStream'
 *
 * const response = await fetch('https://your-streaming-api.com/data')
 * const readableStream = response.body
 *
 * const stream = jsonStream<{ name: string }>(readableStream)
 * for await (const data of stream) {
 *  console.log(data)
 * }
 * ```
 */
export const jsonParser = async function* <T extends object>(stream: ReadableStream<any>) {
  const reader = stream
    .pipeThrough(new TextDecoderStream()) // Convert bytes to text
    .pipeThrough(jsonTransformStream<T>()) // Parse JSON
    .getReader()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return
      yield value
    }
  } finally {
    reader.releaseLock()
  }
}
