FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY index.html vite.config.ts tsconfig.json vite-env.d.ts ./
COPY public ./public
COPY src ./src
COPY shared ./shared
RUN npm run build:app

FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS runtime

ENV NODE_ENV=production \
    TTDASH_DOCKER=1 \
    TTDASH_DATA_DIR=/data/data \
    TTDASH_CONFIG_DIR=/data/config \
    TTDASH_CACHE_DIR=/data/cache

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
COPY shared ./shared
COPY server.js usage-normalizer.js ./

RUN mkdir -p /data/data /data/config /data/cache && chown -R node:node /data

USER node
EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/runtime',{headers:{Authorization:'Bearer '+process.env.TTDASH_REMOTE_TOKEN}}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "server.js", "--docker"]
