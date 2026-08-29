import { buildApp } from "./app.js";

const app = buildApp();
app.listen({ port: Number(process.env.PORT ?? 8080), host: "0.0.0.0" })
  .then((address: string) => console.log(`relay on ${address}`));