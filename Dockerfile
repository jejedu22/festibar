# ---------- Étape 1 : build du frontend (Vue 3 + Vite) ----------
FROM node:22-slim AS frontend-build
WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ---------- Étape 2 : dépendances de production du backend ----------
# Image complète : contient python3/make/g++ si sqlite3 ou bcrypt doivent être compilés
FROM node:22 AS backend-deps
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# ---------- Étape 3 : image finale ----------
FROM node:22-slim
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3001 \
    SQLITE_FILE=/app/data/bar.db \
    UV_THREADPOOL_SIZE=8 \
    NODE_OPTIONS=--max-old-space-size=144

COPY --from=backend-deps /app/node_modules ./node_modules
COPY backend/ ./
# Le frontend compilé remplace celui éventuellement présent dans backend/public
RUN rm -rf ./public
COPY --from=frontend-build /frontend/dist ./public

RUN mkdir -p /app/data

VOLUME ["/app/data"]
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3001) + '/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "index.js"]
