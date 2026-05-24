# =============================================================================
# Stage 1 — Build the React frontend
# =============================================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Install dependencies first (better layer caching)
COPY frontend/package*.json ./
RUN npm ci

# Copy source and build
COPY frontend/ ./
RUN npm run build
# Output: /app/frontend/dist

# =============================================================================
# Stage 2 — Production Express server
# =============================================================================
FROM node:20-alpine AS production

WORKDIR /app/backend

# Install backend dependencies
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ ./

# Copy the React build output into a location that app.js resolves to:
#   path.join(__dirname, "../../frontend/dist")
#   __dirname inside src/app.js  →  /app/backend/src
#   ../../frontend/dist          →  /app/frontend/dist   ✓
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Expose the single port
EXPOSE 3000

# Environment — override in ECS Task Definition; never bake secrets into images
ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server.js"]
