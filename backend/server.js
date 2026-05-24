import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import http from "http";
import { initSocket } from "./src/sockets/server.socket.js";
import app from "./src/app.js";
import connectTOdb from "./src/config/database.js";

// ---------------------------------------------------------------------------
// Trust the AWS ALB / reverse proxy so that:
//   • req.protocol returns "https" (needed for secure cookies to work)
//   • req.ip returns the real client IP (not the load-balancer IP)
// ---------------------------------------------------------------------------
app.set("trust proxy", 1);

const httpServer = http.createServer(app);

initSocket(httpServer);
connectTOdb();

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
});
