# ── development stage ────────────────────────────────────────────────────────
# Installs all deps (including devDependencies so nodemon is available).
# Source is NOT copied here — it is bind-mounted at runtime so edits on the
# host are reflected in the container instantly without a rebuild.
FROM node:18-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
EXPOSE 3001
CMD ["npm", "run", "dev"]

# ── production stage ─────────────────────────────────────────────────────────
FROM node:18-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
