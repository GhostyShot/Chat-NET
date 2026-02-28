import { createServer } from "node:http";
import { createApp } from "./app.js";
import { appConfig } from "./config.js";
import { setupRealtime } from "./realtime.js";

const app = createApp();
const server = createServer(app);

setupRealtime(server);

server.listen(appConfig.port, () => {
  console.log(`Chat-Net API läuft auf http://localhost:${appConfig.port}`);
});