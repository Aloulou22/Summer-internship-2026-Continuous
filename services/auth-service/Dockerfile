# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app
ENV NODE_OPTIONS=--dns-result-order=ipv4first

# Install deps first (better layer caching)
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm config set maxsockets 3 \
    && npm install

# Copy source and build
COPY . .
RUN npm run build

EXPOSE 3001
CMD ["node", "dist/main"]
