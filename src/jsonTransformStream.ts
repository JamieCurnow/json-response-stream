import { hashString } from './hashString'
import { safeParse } from './safeParse'

/**
 * A transform stream that parses JSON objects from a stream of JSON strings.
 * It can handle partial JSON data spread across multiple chunks.
 * It can handle multiple JSON objects in a single chunk.
 * It skips duplicate objects to avoid processing the same object multiple times.
 *
 * @returns A transform stream that parses JSON objects.
 * @template T The expected type of the parsed JSON object. - this is not validated at runtime, but can be used for type hinting.
 * @example
 *
 * ```ts
 * import { jsonTransformStream } from './jsonTransformStream'
 *
 * const jsonStream = new ReadableStream({
 *   start(controller) {
 *     controller.enqueue('{"name": "John"}')
 *     controller.enqueue('{"name": "Alice"}')
 *     controller.enqueue('{"name": "Bob"}')
 *     controller.close()
 *   }
 * })
 *
 * const reader = jsonStream.pipeThrough(jsonTransformStream()).getReader()(async () => {
 *   while (true) {
 *     const { done, value } = await reader.read()
 *     if (done) break
 *     console.log(value)
 *   }
 * })()
 * ```
 */
export const jsonTransformStream = <T extends object>() => {
  let buffer = '' // Store partial JSON data
  const processedHashes = new Set<string>() // To track processed objects

  return new TransformStream<string, T>({
    start() {
      buffer = '' // Initialize buffer
      processedHashes.clear()
    },
    transform(chunk, controller) {
      buffer += chunk // Append new data

      // Extract complete JSON objects using a non-regex approach
      let startPos = 0
      while (startPos < buffer.length) {
        // Find the start of a JSON object
        const objectStart = buffer.indexOf('{', startPos)
        if (objectStart === -1) break

        // Look for the matching closing brace
        let openBraces = 0
        let inString = false
        let escaped = false
        let objectEnd = -1

        for (let i = objectStart; i < buffer.length; i++) {
          const char = buffer[i]

          if (inString) {
            if (escaped) {
              escaped = false
            } else if (char === '\\') {
              escaped = true
            } else if (char === '"') {
              inString = false
            }
          } else if (char === '"') {
            inString = true
          } else if (char === '{') {
            openBraces++
          } else if (char === '}') {
            openBraces--
            if (openBraces === 0) {
              objectEnd = i
              break
            }
          }
        }

        // If we found a complete object
        if (objectEnd !== -1) {
          const jsonStr = buffer.substring(objectStart, objectEnd + 1)

          // Create a simple hash of the object to avoid reprocessing
          const hash = hashString(jsonStr)

          if (!processedHashes.has(hash)) {
            const parsed = safeParse<T>(jsonStr)
            if (parsed) {
              controller.enqueue(parsed)
              processedHashes.add(hash)
            }
          }

          startPos = objectEnd + 1
        } else {
          // No complete object found yet
          break
        }
      }

      // Keep only the unprocessed part
      if (startPos > 0) {
        buffer = buffer.slice(startPos)
      }
    }
  })
}
