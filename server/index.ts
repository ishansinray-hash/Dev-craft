import { buildApp } from "./app.js";

const app = buildApp();
const PORT = 3000;

app.listen({ port: PORT, host: "0.0.0.0" })
  .then((address: string) => console.log(`OrderKaro Relay on ${address}`));
