import { Server } from "socket.io";

let io;

export function initSocket(httpserver) {
    // In production the frontend is served from the same origin as the backend,
    // so Socket.IO does NOT need a separate CORS allowlist.
    // In development the Vite dev-server is on :5173, so we allow that origin.
    const corsOptions =
        process.env.NODE_ENV === "production"
            ? { origin: false }   // same-origin → disable CORS
            : {
                  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
                  credentials: true,
              };

    io = new Server(httpserver, { cors: corsOptions });

    console.log("socket.io server is running");

    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);
    });
}

export function getIO() {
    if (!io) {
        throw new Error("socket.io not initialized");
    }
    return io;
}