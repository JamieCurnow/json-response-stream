import { describe, it, expect, vi, beforeEach } from 'vitest'
import { jsonParser } from './jsonParser'

describe('jsonParser', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // Helper function to create a readable stream from chunks
  const createReadableStream = (chunks: string[]) => {
    const encoder = new TextEncoder()
    return new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)))
        controller.close()
      }
    })
  }

  // Helper function to collect all items from async iterator
  const collectAsyncIterator = async <T>(iterator: AsyncIterableIterator<T>): Promise<T[]> => {
    const result: T[] = []
    for await (const item of iterator) {
      result.push(item)
    }
    return result
  }

  it('should parse a single complete JSON object', async () => {
    const jsonString = '{"name": "John", "age": 30}'

    const stream = createReadableStream([jsonString])
    const result = await collectAsyncIterator(jsonParser<{ name: string; age: number }>(stream))
    expect(result).toEqual([{ name: 'John', age: 30 }])
  })

  it('should parse multiple JSON objects in sequence', async () => {
    const jsonObjects = [
      '{"id": 1, "name": "Alice"}',
      '{"id": 2, "name": "Bob"}',
      '{"id": 3, "name": "Charlie"}'
    ]

    const stream = createReadableStream(jsonObjects)
    const result = await collectAsyncIterator(jsonParser<{ id: number; name: string }>(stream))

    expect(result).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' }
    ])
  })

  it('should parse partial JSON objects spread across multiple chunks', async () => {
    const chunks = ['{"id": 1, "na', 'me": "Alice"}', '{"id": 2, ', '"name": "Bo', 'b"}']

    const stream = createReadableStream(chunks)
    const result = await collectAsyncIterator(jsonParser<{ id: number; name: string }>(stream))

    expect(result).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ])
  })

  it('should parse multiple JSON objects in a single chunk', async () => {
    const singleChunk = '{"id": 1, "name": "Alice"}{"id": 2, "name": "Bob"}{"id": 3, "name": "Charlie"}'

    const stream = createReadableStream([singleChunk])
    const result = await collectAsyncIterator(jsonParser<{ id: number; name: string }>(stream))

    expect(result).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' }
    ])
  })

  it('should handle invalid JSON in the middle of a stream', async () => {
    const chunks = ['{"id": 1, "name": "Alice"}', '{invalid-json}', '{"id": 2, "name": "Bob"}']

    const stream = createReadableStream(chunks)
    const result = await collectAsyncIterator(jsonParser<{ id: number; name: string }>(stream))

    // The invalid JSON should be skipped
    expect(result).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ])
  })

  it('should handle nested objects and arrays', async () => {
    const jsonString =
      '{"user": {"name": "Alice", "profile": {"age": 30}}, "tags": ["developer", "designer"]}'

    const stream = createReadableStream([jsonString])
    const result = await collectAsyncIterator(jsonParser<any>(stream))

    expect(result).toEqual([
      {
        user: { name: 'Alice', profile: { age: 30 } },
        tags: ['developer', 'designer']
      }
    ])
  })

  it('should skip duplicate objects', async () => {
    const chunks = ['{"id": 1, "name": "Alice"}', '{"id": 1, "name": "Alice"}', '{"id": 2, "name": "Bob"}']

    const stream = createReadableStream(chunks)
    const result = await collectAsyncIterator(jsonParser<{ id: number; name: string }>(stream))

    // Duplicates should be skipped
    expect(result).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ])
  })

  it('should handle empty chunks', async () => {
    const chunks = ['', '{"id": 1, "name": "Alice"}', '', '{"id": 2, "name": "Bob"}', '']

    const stream = createReadableStream(chunks)
    const result = await collectAsyncIterator(jsonParser<{ id: number; name: string }>(stream))

    expect(result).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ])
  })

  it('should handle complex JSON with escaped quotes and special characters', async () => {
    const jsonString =
      '{"message": "This is a \\"quoted\\" text with \\n new lines and \\t tabs", "code": "const x = \\"test\\";", "emoji": "😀🚀"}'

    const stream = createReadableStream([jsonString])
    const result = await collectAsyncIterator(jsonParser<any>(stream))

    expect(result).toEqual([
      {
        message: 'This is a "quoted" text with \n new lines and \t tabs',
        code: 'const x = "test";',
        emoji: '😀🚀'
      }
    ])
  })
})
