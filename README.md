# Pledge Streaming

A TypeScript library for streaming objects containing promises over HTTP using JSON Lines format. This enables progressive data loading where you can start working with skeleton data immediately while async operations complete in the background.

## 🚀 Features

- **Progressive Loading**: Send objects containing promises and receive data as it becomes available
- **JSON Lines Streaming**: Efficient streaming using newline-delimited JSON
- **Type Safe**: Full TypeScript support with proper type inference
- **Framework Agnostic**: Works with any HTTP framework (Express adapter included)
- **Client-Server**: Both server and client implementations included

## 📖 How It Works

1. **Server Side**: Objects containing promises are processed:

   - Promises are replaced with placeholder strings (`$1$`, `$2$`, etc.)
   - The "skeleton" object is sent first with placeholders
   - As promises resolve, their values are streamed as separate items

2. **Client Side**: The stream is reconstructed:
   - Placeholders are replaced with new promises
   - These promises resolve when corresponding data arrives from the stream

## 🛠️ Installation

```bash
npm install @victor141516/pledge
```

🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.📄 LicenseMIT License - see LICENSE file for details.
