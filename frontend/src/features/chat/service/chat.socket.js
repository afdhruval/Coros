import { io } from "socket.io-client";

let socket = null;

export const initializeSocket = () => {
    if (!socket) {
        // ---------------------------------------------------------------------------
        // In PRODUCTION Express serves the frontend from the same origin, so
        // Socket.IO must connect to window.location.origin (e.g. http://mydomain.com).
        // In DEVELOPMENT the Vite proxy forwards WebSocket upgrades to :3000, but
        // socket.io-client needs an explicit path; connecting to "" (empty string)
        // tells the library to use the current page origin — which Vite proxies.
        // ---------------------------------------------------------------------------
        socket = io("/", {
            withCredentials: true,
            // This ensures the WS connection goes to the same origin (Vite proxies it
            // to :3000 in dev; Express handles it directly in production)
            path: "/socket.io",
        });

        socket.on("connect", () => {
            console.log("Connected to server:", socket.id);
        });

        socket.on("disconnect", () => {
            console.log("Disconnected from server");
        });
    }

    return socket;
};

export const getSocket = () => {
    if (!socket) {
        throw new Error("Socket not initialized");
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};