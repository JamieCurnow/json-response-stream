import { describe, it, expect, vi, beforeEach } from 'vitest'
import { jsonParser, jsonTransformStream, safeParse, hashString } from './index'

describe('Integration Tests', () => {
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

  it('should work end-to-end with realistic streaming JSON data', async () => {
    // Simulate streaming response from an LLM or API
    const chunks = [
      '{"type": "message", "content": "Hello",',
      ' "timestamp": 1234567890}',
      '{"type": "message", "content": "World",',
      ' "timestamp": 1234567891}',
      '{"type": "status", "code": 200}'
    ]

    const stream = createReadableStream(chunks)
    const result = await collectAsyncIterator(jsonParser<{
      type: string;
      content?: string;
      timestamp?: number;
      code?: number;
    }>(stream))

    expect(result).toEqual([
      { type: 'message', content: 'Hello', timestamp: 1234567890 },
      { type: 'message', content: 'World', timestamp: 1234567891 },
      { type: 'status', code: 200 }
    ])
  })

  it('should handle duplicate detection across the full pipeline', async () => {
    const jsonString1 = '{"id": 1, "name": "Alice"}'
    const jsonString2 = '{"id": 2, "name": "Bob"}'
    
    // Test that hashing produces consistent results for the same JSON
    const hash1a = hashString(jsonString1)
    const hash1b = hashString(jsonString1)
    const hash2 = hashString(jsonString2)
    
    expect(hash1a).toBe(hash1b)
    expect(hash1a).not.toBe(hash2)

    // Test full pipeline with duplicates
    const chunks = [jsonString1, jsonString2, jsonString1, jsonString2]
    const stream = createReadableStream(chunks)
    const result = await collectAsyncIterator(jsonParser<{ id: number; name: string }>(stream))

    // Should only get unique objects
    expect(result).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ])
  })

  it('should handle error recovery in the full pipeline', async () => {
    const chunks = [
      '{"valid": "object1"}',
      '{invalid-json-data}',
      '{"valid": "object2"}',
      'not-json-at-all',
      '{"valid": "object3"}'
    ]

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const stream = createReadableStream(chunks)
    const result = await collectAsyncIterator(jsonParser<{ valid: string }>(stream))

    expect(result).toEqual([
      { valid: 'object1' },
      { valid: 'object2' },
      { valid: 'object3' }
    ])

    // Should have logged errors for invalid JSON (exact count may vary based on implementation)
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should work with complex real-world JSON structures', async () => {
    const complexData = {
      user: {
        id: 12345,
        profile: {
          name: 'John Doe',
          email: 'john@example.com',
          preferences: {
            theme: 'dark',
            notifications: true,
            languages: ['en', 'es', 'fr']
          }
        },
        metadata: {
          lastLogin: '2023-01-01T00:00:00Z',
          loginCount: 42,
          features: {
            beta: true,
            premium: false
          }
        }
      },
      session: {
        token: 'abc123def456',
        expires: 1672531200,
        permissions: ['read', 'write', 'admin']
      }
    }

    const jsonString = JSON.stringify(complexData)
    const stream = createReadableStream([jsonString])
    const result = await collectAsyncIterator(jsonParser<typeof complexData>(stream))

    expect(result).toEqual([complexData])
  })

  it('should maintain performance with large datasets', async () => {
    // Create a large dataset
    const largeDataset = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      data: {
        value: `item-${i}`,
        metadata: {
          created: new Date().toISOString(),
          tags: [`tag-${i}`, `category-${i % 10}`],
          active: i % 2 === 0
        }
      }
    }))

    const chunks = largeDataset.map(item => JSON.stringify(item))
    
    const startTime = Date.now()
    const stream = createReadableStream(chunks)
    const result = await collectAsyncIterator(jsonParser<typeof largeDataset[0]>(stream))
    const endTime = Date.now()

    expect(result).toHaveLength(100)
    expect(result[0]).toEqual(largeDataset[0])
    expect(result[99]).toEqual(largeDataset[99])
    
    // Should complete in reasonable time (less than 1 second for 100 items)
    expect(endTime - startTime).toBeLessThan(1000)
  })

  it('should handle mixed valid and invalid JSON with safeParse integration', () => {
    const testCases = [
      '{"valid": true}',
      '{invalid}',
      '{"also": "valid"}',
      'not-json',
      '{"number": 42}'
    ]

    const validResults = []
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    for (const testCase of testCases) {
      const parsed = safeParse<any>(testCase)
      if (parsed) {
        validResults.push(parsed)
      }
    }

    expect(validResults).toEqual([
      { valid: true },
      { also: 'valid' },
      { number: 42 }
    ])

    expect(consoleSpy).toHaveBeenCalledTimes(2)
    consoleSpy.mockRestore()
  })

  it('should handle streams that close unexpectedly', async () => {
    let controllerRef: ReadableStreamDefaultController<Uint8Array>
    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      start(controller) {
        controllerRef = controller
        controller.enqueue(encoder.encode('{"started": true}'))
        // Don't close the stream normally
      }
    })

    const parser = jsonParser<{ started?: boolean; completed?: boolean }>(stream)
    const results = []

    for await (const item of parser) {
      results.push(item)
      // Simulate unexpected stream closure
      if (results.length === 1) {
        controllerRef!.close()
        break
      }
    }

    expect(results).toEqual([{ started: true }])
  })

  it('should work with jsonTransformStream directly', async () => {
    const inputData = [
      '{"step": 1, "action": "init"}',
      '{"step": 2, "action": "process"}',
      '{"step": 3, "action": "complete"}'
    ]

    const source = new ReadableStream({
      start(controller) {
        inputData.forEach(data => controller.enqueue(data))
        controller.close()
      }
    })

    const transformedStream = source.pipeThrough(jsonTransformStream<{
      step: number;
      action: string;
    }>())

    const reader = transformedStream.getReader()
    const results = []

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        results.push(value)
      }
    } finally {
      reader.releaseLock()
    }

    expect(results).toEqual([
      { step: 1, action: 'init' },
      { step: 2, action: 'process' },
      { step: 3, action: 'complete' }
    ])
  })
})