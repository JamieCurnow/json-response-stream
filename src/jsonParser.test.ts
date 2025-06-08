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

  it('should handle unicode and international characters', async () => {
    const jsonString = '{"chinese": "你好", "emoji": "🎉🚀", "arabic": "مرحبا", "russian": "Привет"}'

    const stream = createReadableStream([jsonString])
    const result = await collectAsyncIterator(jsonParser<any>(stream))

    expect(result).toEqual([
      {
        chinese: '你好',
        emoji: '🎉🚀',
        arabic: 'مرحبا',
        russian: 'Привет'
      }
    ])
  })

  it('should handle very large JSON objects', async () => {
    const largeArray = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` }))
    const jsonString = JSON.stringify({ data: largeArray, total: largeArray.length })

    const stream = createReadableStream([jsonString])
    const result = await collectAsyncIterator(jsonParser<{ data: any[]; total: number }>(stream))

    expect(result).toHaveLength(1)
    expect(result[0].data).toHaveLength(1000)
    expect(result[0].total).toBe(1000)
    expect(result[0].data[0]).toEqual({ id: 0, value: 'item-0' })
    expect(result[0].data[999]).toEqual({ id: 999, value: 'item-999' })
  })

  it('should handle stream reader errors gracefully', async () => {
    let controllerRef: ReadableStreamDefaultController<Uint8Array>
    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      start(controller) {
        controllerRef = controller
        controller.enqueue(encoder.encode('{"name": "John"}'))
      }
    })

    const parser = jsonParser<{ name: string }>(stream)
    const results = []

    try {
      for await (const item of parser) {
        results.push(item)
        // Error the stream after getting first result
        if (results.length === 1) {
          controllerRef!.error(new Error('Stream error'))
        }
      }
    } catch (error) {
      // Expected to catch the stream error
      expect((error as Error).message).toBe('Stream error')
    }

    expect(results).toEqual([{ name: 'John' }])
  })

  it('should handle empty streams', async () => {
    const stream = createReadableStream([])
    const result = await collectAsyncIterator(jsonParser<any>(stream))

    expect(result).toEqual([])
  })

  it('should handle streams with only whitespace', async () => {
    const stream = createReadableStream(['   ', '\n\t', '  '])
    const result = await collectAsyncIterator(jsonParser<any>(stream))

    expect(result).toEqual([])
  })

  it('should handle deeply nested objects', async () => {
    const deepObject = {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                data: 'deep value',
                array: [1, 2, { nested: true }]
              }
            }
          }
        }
      }
    }
    const jsonString = JSON.stringify(deepObject)

    const stream = createReadableStream([jsonString])
    const result = await collectAsyncIterator(jsonParser<typeof deepObject>(stream))

    expect(result).toEqual([deepObject])
  })

  it('should handle JSON with numbers, booleans, and null values', async () => {
    const jsonString = '{"integer": 42, "float": 3.14, "boolean": true, "null": null, "false": false}'

    const stream = createReadableStream([jsonString])
    const result = await collectAsyncIterator(jsonParser<any>(stream))

    expect(result).toEqual([
      {
        integer: 42,
        float: 3.14,
        boolean: true,
        null: null,
        false: false
      }
    ])
  })

  it('should handle JSON arrays at the top level', async () => {
    // The implementation looks for objects starting with '{', so it will find objects within arrays
    const jsonString1 = '[{"id": 1}, {"id": 2}]'
    const jsonString2 = '{"id": 1}{"id": 2}'

    const stream1 = createReadableStream([jsonString1])
    const result1 = await collectAsyncIterator(jsonParser<any>(stream1))
    
    const stream2 = createReadableStream([jsonString2])
    const result2 = await collectAsyncIterator(jsonParser<any>(stream2))

    // Objects within arrays are parsed (because the parser finds '{' characters)
    expect(result1).toEqual([{ id: 1 }, { id: 2 }])
    // Separate objects are also parsed
    expect(result2).toEqual([{ id: 1 }, { id: 2 }])
  })
})
