import { buildApp } from "./app.js";

const app = buildApp();

// PORT stays configurable: the Dockerfile sets 8080, docker-compose maps
// 8080:8080, and hosted runtimes inject their own. Hardcoding the port makes
// every one of those silently unreachable. Override locally with PORT=3000.
const PORT = Number(process.env.PORT ?? 8080);

app.listen({ port: PORT, host: "0.0.0.0" })
  .then((address: string) => console.log(`OrderKaro Relay on ${address}`));
