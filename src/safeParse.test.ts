import { describe, it, expect, vi } from 'vitest'
import { safeParse } from './safeParse'

describe('safeParse', () => {
  it('should parse valid JSON string', () => {
    const result = safeParse<{ name: string }>('{"name": "test"}')
    expect(result).toEqual({ name: 'test' })
  })

  it('should return null for invalid JSON', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = safeParse<object>('{invalid json}')
    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should handle complex nested objects', () => {
    const jsonString =
      '{"user": {"name": "John", "age": 30, "address": {"city": "New York"}}, "active": true}'
    const result = safeParse<{
      user: { name: string; age: number; address: { city: string } }
      active: boolean
    }>(jsonString)

    expect(result).toEqual({
      user: {
        name: 'John',
        age: 30,
        address: {
          city: 'New York'
        }
      },
      active: true
    })
  })

  it('should handle arrays', () => {
    const jsonString = '{"items": [1, 2, 3], "names": ["alice", "bob"]}'
    const result = safeParse<{ items: number[]; names: string[] }>(jsonString)

    expect(result).toEqual({
      items: [1, 2, 3],
      names: ['alice', 'bob']
    })
  })

  it('should handle empty objects', () => {
    const result = safeParse<object>('{}')
    expect(result).toEqual({})
  })

  it('should handle empty arrays', () => {
    const result = safeParse<any[]>('[]')
    expect(result).toEqual([])
  })

  it('should log the error and return null for syntax errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = safeParse<object>('{"name": "test"')
    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalledWith('JSON Parse Error:', '{"name": "test"')
    consoleSpy.mockRestore()
  })

  it('should handle unicode characters in JSON', () => {
    const jsonString = '{"emoji": "🎉", "chinese": "你好", "math": "∑∫∆"}'
    const result = safeParse<{ emoji: string; chinese: string; math: string }>(jsonString)

    expect(result).toEqual({
      emoji: '🎉',
      chinese: '你好',
      math: '∑∫∆'
    })
  })

  it('should handle JSON with scientific notation', () => {
    const jsonString = '{"large": 1.23e10, "small": 4.56e-5, "normal": 123.45}'
    const result = safeParse<{ large: number; small: number; normal: number }>(jsonString)

    expect(result).toEqual({
      large: 1.23e10,
      small: 4.56e-5,
      normal: 123.45
    })
  })

  it('should handle JSON with null and undefined values correctly', () => {
    const jsonString = '{"nullValue": null, "definedValue": "test"}'
    const result = safeParse<{ nullValue: null; definedValue: string }>(jsonString)

    expect(result).toEqual({
      nullValue: null,
      definedValue: 'test'
    })
  })

  it('should handle JSON with very large numbers', () => {
    const jsonString = '{"bigInt": 9007199254740991, "normalInt": 42}'
    const result = safeParse<{ bigInt: number; normalInt: number }>(jsonString)

    expect(result).toEqual({
      bigInt: 9007199254740991,
      normalInt: 42
    })
  })

  it('should return null for non-string input', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // @ts-expect-error - intentionally passing wrong type to test runtime behavior
    const result = safeParse<object>(null)
    expect(result).toBeNull()
    // The actual implementation might not log an error for null input, just catch the JSON.parse error
    consoleSpy.mockRestore()
  })

  it('should handle edge case JSON with only whitespace and braces', () => {
    const jsonString = '{   }'
    const result = safeParse<object>(jsonString)

    expect(result).toEqual({})
  })
})
