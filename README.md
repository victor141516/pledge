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

## 📚 Usage Examples

### Server Side (Express)

```ts
import { pledgeMiddleware } from "@victor141516/pledge/adapters/express";
import express from "express";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createDataWithPromises = () => {
  return {
    immediate: "This data is available right away",
    delayed5s: sleep(5000).then(() => "Resolved after 5s"),
    nested: {
      delayed1s: sleep(1000).then(() => "Nested resolved after 1s"),
      deeplyNested: sleep(0).then(() => "Deeply nested resolved immediately"),
      nestedPromises: sleep(1000).then(() => ({
        alsoWork: sleep(1000).then(() => "Also nested promises work"),
      })),
    },
  } as const;
};

const app = express();

// Add the pledge middleware
app.use(pledgeMiddleware);

app.get("/data", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Send object with promises - they'll be streamed as they resolve
  res.sendPledge(createDataWithPromises());
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

### Client Side

```ts
import { readResponse } from "@victor141516/pledge/client";

async function fetchStreamingData() {
  const response = await fetch("http://localhost:3000/data");

  // readResponse returns the reconstructed object with promises
  const data = await readResponse<ReturnType<typeof createDataWithPromises>>(
    response
  );

  console.log("Root object received immediately:", data);
  console.log("Immediate values:", data.immediate);

  // These promises will resolve as data streams in
  data.delayed5s.then((value) => console.log("delayed5s resolved:", value));
  data.nested.delayed1s.then((value) =>
    console.log("nested.delayed1s resolved:", value)
  );
  data.nested.deeplyNested.then((value) =>
    console.log("nested.deeplyNested resolved:", value)
  );
  data.nested.nestedPromises.then(({ alsoWork }) =>
    alsoWork.then((value) =>
      console.log("nested.nestedPromises.alsoWork resolved:", value)
    )
  );
}

fetchStreamingData();
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.📄

## License

MIT License - see LICENSE file for details.

```

```
