FROM node:24-slim

WORKDIR /app

# Frontend dependencies & production build
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci --no-audit --no-fund

COPY frontend ./frontend
RUN cd frontend && npm run build

# Backend (zero external npm dependencies, uses Node 24 built-ins + SQLite)
COPY backend ./backend

RUN mkdir -p /app/backend/data/backups

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8787
ENV TRUST_PROXY=1
ENV COOKIE_SECURE=1

EXPOSE 8787

CMD ["node", "--env-file-if-exists=.env", "backend/server.mjs"]
