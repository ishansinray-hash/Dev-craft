FROM node:22-bookworm-slim

WORKDIR /app
# The repository's lockfile is bun.lock, so there is no package-lock.json for
# `npm ci` to read. Install from package.json instead.
COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/data/relay.db
EXPOSE 8080

CMD ["npm", "run", "start"]