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
})
