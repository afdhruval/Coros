import dotenv from "dotenv";
dotenv.config();
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import authRouter from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import cors from "cors";
import session from "express-session";
import passport from "./config/passport.js";
import chatRouter from "./routes/chat.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
// In production, the frontend and backend are served from the same origin
// (same domain + port), so no cross-origin requests exist and CORS can be
// completely disabled.  We only enable it in development so that the Vite
// dev-server on :5173 can talk to the Express server on :3000.
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV !== "production") {
    app.use(
        cors({
            origin: "http://localhost:5173",
            credentials: true,
        })
    );
}

app.use(express.json());
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(
    session({
        secret: process.env.SESSION_SECRET || "coros_session_secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            // secure: true requires HTTPS; set to true when behind an HTTPS load-balancer
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax",
            maxAge: 24 * 60 * 60 * 1000,
        },
    })
);

app.use(passport.initialize());
app.use(passport.session());

// ---------------------------------------------------------------------------
// API Routes  (must come BEFORE the static-file / SPA fallback block)
// ---------------------------------------------------------------------------
app.use("/api/auth", authRouter);
app.use("/auth", authRouter);       // Google OAuth lives at /auth/google[/callback]
app.use("/api/chats", chatRouter);

// ---------------------------------------------------------------------------
// Serve React frontend (production only)
// ---------------------------------------------------------------------------
// The Vite build output is at  frontend/dist  which we copy next to the
// backend at build time (see Dockerfile / ECS notes).
// In development this block is skipped; Vite's own dev-server handles it.
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV === "production") {
    const distPath = path.join(__dirname, "../../frontend/dist");

    // Serve static assets (JS bundles, CSS, images, …)
    app.use(express.static(distPath));

    // React Router catch-all: every non-API GET returns index.html so that
    // client-side routes work after a hard refresh.
    app.get("/*splat", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
    });
}

// ---------------------------------------------------------------------------
// Global Error Handler
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
    console.error("Internal Server Error:", err);
    res.status(500).json({
        message: "Internal Server Error",
        success: false,
        error: err.message,
    });
});

export default app;