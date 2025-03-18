// Safe JSON parser function
export const safeParse = <T extends object>(str: string): T | null => {
  try {
    return JSON.parse(str) as T
  } catch {
    console.error('JSON Parse Error:', str)
    return null
  }
}
