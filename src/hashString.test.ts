import { describe, it, expect } from 'vitest'
import { hashString } from './hashString'

describe('hashString', () => {
  it('should generate a hash from a string', () => {
    const result = hashString('test')
    expect(typeof result).toBe('string')
    expect(result).not.toBe('')
  })

  it('should return consistent results for the same input', () => {
    const input = 'hello world'
    const firstHash = hashString(input)
    const secondHash = hashString(input)
    expect(firstHash).toBe(secondHash)
  })

  it('should produce different hashes for different inputs', () => {
    const hash1 = hashString('test1')
    const hash2 = hashString('test2')
    expect(hash1).not.toBe(hash2)
  })

  it('should handle empty strings', () => {
    const result = hashString('')
    expect(typeof result).toBe('string')
    expect(result).toBe('0')
  })

  it('should handle special characters', () => {
    const result = hashString('!@#$%^&*()')
    expect(typeof result).toBe('string')
    expect(result).not.toBe('')
  })

  it('should handle long strings', () => {
    const longString = 'a'.repeat(1000)
    const result = hashString(longString)
    expect(typeof result).toBe('string')
    expect(result).not.toBe('')
  })

  it('should handle unicode characters', () => {
    const unicodeString = '🎉你好∑∫∆'
    const result = hashString(unicodeString)
    expect(typeof result).toBe('string')
    expect(result).not.toBe('')
    expect(result).not.toBe('0')
  })

  it('should produce consistent hashes for equivalent JSON strings', () => {
    const json1 = '{"name":"John","age":30}'
    const json2 = '{"name":"John","age":30}'
    const hash1 = hashString(json1)
    const hash2 = hashString(json2)
    expect(hash1).toBe(hash2)
  })

  it('should produce different hashes for different JSON formatting', () => {
    const json1 = '{"name":"John","age":30}'
    const json2 = '{"name": "John", "age": 30}'
    const hash1 = hashString(json1)
    const hash2 = hashString(json2)
    expect(hash1).not.toBe(hash2)
  })

  it('should handle strings with null bytes', () => {
    const stringWithNull = 'test\0string'
    const result = hashString(stringWithNull)
    expect(typeof result).toBe('string')
    expect(result).not.toBe('')
  })

  it('should handle very short strings', () => {
    const result1 = hashString('a')
    const result2 = hashString('b')
    expect(typeof result1).toBe('string')
    expect(typeof result2).toBe('string')
    expect(result1).not.toBe(result2)
  })

  it('should handle repeated patterns', () => {
    const pattern1 = 'abc'.repeat(100)
    const pattern2 = 'def'.repeat(100)
    const hash1 = hashString(pattern1)
    const hash2 = hashString(pattern2)
    expect(hash1).not.toBe(hash2)
  })
})
