# KAYAR — production image for Liara (Docker platform)
# Stage 1: build the React SPA from the monorepo
FROM node:20-alpine AS build
WORKDIR /repo
COPY . .
RUN npm ci --ignore-scripts --no-audit --no-fund
RUN cd apps/kayar && npx vite build --outDir /out --emptyOutDir

# Stage 2: serve with nginx, proxy /api/* to the KAYAR backend (Zite)
FROM nginx:1.27-alpine
ENV BACKEND_HOST=kayar.zite.so
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /out /usr/share/nginx/html
EXPOSE 80
