// ---------------------------------------------------------------------------
// API base URL
// ---------------------------------------------------------------------------
// In PRODUCTION the frontend is served by Express from the same origin, so all
// API calls must use relative paths (empty baseURL).  Axios will then send
// requests to the current window origin automatically.
//
// In DEVELOPMENT (Vite dev-server on :5173) we proxy /api → :3000 via
// vite.config.js, so the baseURL must still be empty ("") — the proxy handles
// it.  We no longer need VITE_API_URL at all.
// ---------------------------------------------------------------------------

export const API_URL = "";  // always empty — use relative paths everywhere