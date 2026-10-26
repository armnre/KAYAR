# KAYAR — fully self-hosted image (website + backend + your own PostgreSQL). No dependency on Zite.
FROM node:22-alpine AS build
WORKDIR /repo
COPY . .
RUN npm install --ignore-scripts --no-audit --no-fund
RUN cd standalone && npm install --ignore-scripts --no-audit --no-fund && node build.mjs

FROM node:22-alpine
WORKDIR /srv
ENV NODE_ENV=production PORT=3000 STATIC_DIR=/srv/public UPLOAD_DIR=/data/uploads SEED_FILE=/srv/seed/data.json.gz
COPY --from=build /repo/standalone/dist/server.mjs ./server.mjs
COPY --from=build /repo/standalone/dist/public ./public
COPY --from=build /repo/standalone/seed ./seed
EXPOSE 3000
CMD ["node", "server.mjs"]
