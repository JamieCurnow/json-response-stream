# json-response-stream

[![npm version](https://img.shields.io/npm/v/json-response-stream.svg)](https://www.npmjs.com/package/json-response-stream)
[![license](https://img.shields.io/npm/l/json-response-stream.svg)](https://github.com/JamieCurnow/json-response-stream/blob/main/LICENSE)

A tiny, powerful utility for streaming JSON from API responses, LLMs (like Genkit), and anywhere else you're getting a stream of JSON objects.

## ✨ Features

- 🧩 Parse multiple JSON objects from a stream
- 🔄 Handle partial JSON data across multiple chunks
- 🔍 Skip duplicate objects automatically
- 🛡️ Safely parse without throwing errors
- 🧵 Works great with `fetch`, LLM APIs, or any ReadableStream

## 🚀 Quick Start

```bash
npm install json-response-stream
# or
yarn add json-response-stream
# or
pnpm add json-response-stream
```

## 🌟 Usage

### Basic Example

```typescript
import { jsonParser } from 'json-response-stream'

// Let's fetch some streaming data!
const response = await fetch('https://api.example.com/stream')

// The magic happens here ✨
for await (const data of jsonParser(response.body)) {
  console.log('Got new data:', data)
  // Do something cool with each JSON object as it arrives
}
```

### Handling Stream with TypeScript

```typescript
import { jsonParser } from 'json-response-stream'

interface User {
  id: number
  name: string
  role: string
}

const response = await fetch('https://api.example.com/users/stream')

// Type safety! 🛡️
for await (const user of jsonParser<User>(response.body)) {
  console.log(`Welcome, ${user.name} the ${user.role}!`)
}
```

### LLM Example - Genkit on a Nuxt (h3) server

```typescript
// server side:
const { stream } = await ai.generateStream('Suggest a complete menu for a pirate themed restaurant.')

const transformedStream = ReadableStream.from(stream).pipeThrough(
  new TransformStream({
    transform(chunk, controller) {
      controller.enqueue(JSON.stringify(chunk))
    }
  })
)

// Send the stream to the client
sendStream(event, transformedStream)

// Client side:

const response = await fetch('/api/genkit/stream')

// Process each chunk as it comes in!
for await (const idea of jsonParser(response.body)) {
  console.log(chunk.text)
}
```

## 🧰 API Reference

### Main Function

#### `jsonParser<T>(stream: ReadableStream): AsyncIterableIterator<T>`

The star of the show! Creates an async iterator that processes a stream and yields JSON objects as they become available.

```typescript
// Advanced example with fetch and AbortController
const controller = new AbortController()
const response = await fetch('https://api.example.com/stream', {
  signal: controller.signal
})

setTimeout(() => controller.abort(), 5000) // Cancel after 5 seconds

try {
  for await (const data of jsonParser(response.body)) {
    console.log(data)
  }
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Stream reading was cancelled! 🛑')
  } else {
    console.error('Error processing stream:', error)
  }
}
```

### Other Exports

#### `jsonTransformStream<T>()`

Creates a TransformStream for processing JSON chunks. Useful if you're working directly with the Streams API.

```typescript
const transformedStream = someReadableStream
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(jsonTransformStream())
```

#### `safeParse<T>(str: string): T | null`

A JSON.parse wrapper that never throws - returns null on invalid JSON.

#### `hashString(str: string): string`

A simple string hashing function used internally to detect duplicates.

## Why use json-response-stream?

Streaming APIs are awesome, but dealing with chunked JSON can be a pain. This library makes it seamless to:

- Process large datasets without waiting for the entire response
- Handle real-time updates from LLMs and other streaming APIs
- Avoid the headaches of parsing partial JSON chunks

## 🙌 Contributing

Contributions welcome! Open an issue or PR on [GitHub](https://github.com/JamieCurnow/json-response-stream).

## 📄 License

MIT - do awesome things with it!

---

## Publishing

1. Update the version in `package.json`
2. Run
   `npm run build && npm publish`

Made with ❤️ by [Jamie Curnow](https://github.com/JamieCurnow)
