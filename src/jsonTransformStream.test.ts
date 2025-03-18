import { describe, it, expect, vi, beforeEach } from 'vitest'
import { jsonTransformStream } from './jsonTransformStream'

describe('jsonTransformStream', () => {
  // Helper function to create a readable stream from chunks
  const createReadableStream = (chunks: string[]) => {
    return new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(chunk))
        controller.close()
      }
    })
  }

  // Helper function to read all data from a stream
  const readAllFromStream = async <T>(stream: ReadableStream<T>): Promise<T[]> => {
    const reader = stream.getReader()
    const result: T[] = []

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        result.push(value)
      }
      return result
    } finally {
      reader.releaseLock()
    }
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should parse a single complete JSON object', async () => {
    const stream = createReadableStream(['{"name": "John", "age": 30}'])

    const result = await readAllFromStream(
      stream.pipeThrough(jsonTransformStream<{ name: string; age: number }>())
    )

    expect(result).toEqual([{ name: 'John', age: 30 }])
  })

  it('should parse multiple JSON objects in sequence', async () => {
    const stream = createReadableStream([
      '{"name": "John", "age": 30}',
      '{"name": "Alice", "age": 25}',
      '{"name": "Bob", "age": 40}'
    ])

    const result = await readAllFromStream(
      stream.pipeThrough(jsonTransformStream<{ name: string; age: number }>())
    )

    expect(result).toEqual([
      { name: 'John', age: 30 },
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 40 }
    ])
  })

  it('should parse partial JSON objects spread across multiple chunks', async () => {
    const stream = createReadableStream(['{"name": "Jo', 'hn", "age": ', '30}'])

    const result = await readAllFromStream(
      stream.pipeThrough(jsonTransformStream<{ name: string; age: number }>())
    )

    expect(result).toEqual([{ name: 'John', age: 30 }])
  })

  it('should parse multiple JSON objects in a single chunk', async () => {
    const stream = createReadableStream(['{"name": "John", "age": 30}{"name": "Alice", "age": 25}'])

    const result = await readAllFromStream(
      stream.pipeThrough(jsonTransformStream<{ name: string; age: number }>())
    )

    expect(result).toEqual([
      { name: 'John', age: 30 },
      { name: 'Alice', age: 25 }
    ])
  })

  it('should handle nested objects and arrays', async () => {
    const stream = createReadableStream([
      '{"user": {"name": "John", "hobbies": ["reading", "swimming"]}, "active": true}'
    ])

    const result = await readAllFromStream(
      stream.pipeThrough(
        jsonTransformStream<{
          user: { name: string; hobbies: string[] }
          active: boolean
        }>()
      )
    )

    expect(result).toEqual([
      {
        user: {
          name: 'John',
          hobbies: ['reading', 'swimming']
        },
        active: true
      }
    ])
  })

  it('should skip duplicate objects', async () => {
    const stream = createReadableStream([
      '{"name": "John", "age": 30}',
      '{"name": "John", "age": 30}', // Duplicate
      '{"name": "Alice", "age": 25}'
    ])

    const result = await readAllFromStream(
      stream.pipeThrough(jsonTransformStream<{ name: string; age: number }>())
    )

    // Should only have two objects, not three
    expect(result).toEqual([
      { name: 'John', age: 30 },
      { name: 'Alice', age: 25 }
    ])
  })

  it('should handle complex JSON with escaped quotes and special characters', async () => {
    const stream = createReadableStream([
      '{"text": "This has \\"quotes\\" and special chars: \\n\\t\\r", "array": [1, 2, {"nested": true}]}'
    ])

    const result = await readAllFromStream(stream.pipeThrough(jsonTransformStream<any>()))

    expect(result).toEqual([
      {
        text: 'This has "quotes" and special chars: \n\t\r',
        array: [1, 2, { nested: true }]
      }
    ])
  })

  it('should handle empty chunks', async () => {
    const stream = createReadableStream(['', '{"name": "John"}', ''])

    const result = await readAllFromStream(stream.pipeThrough(jsonTransformStream<{ name: string }>()))

    expect(result).toEqual([{ name: 'John' }])
  })
})
