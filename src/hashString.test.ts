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
})
