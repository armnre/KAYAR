# KAYAR — production image for Liara (platform: docker)
# Stage 1: build the React SPA from the monorepo
FROM node:22-alpine AS build
WORKDIR /repo
COPY . .
RUN npm install --ignore-scripts --no-audit --no-fund
# Brand/SEO head for crawlers (the app also injects these at runtime)
RUN cd apps/kayar \
 && sed -i '/<link rel="icon"/d; /<meta name="viewport"/d; /<title>/d' index.html \
 && sed -i 's/<html lang="en">/<html lang="fa" dir="rtl" class="dark">/' index.html \
 && sed -i '/<meta charset="UTF-8" \/>/r /repo/deploy/head.html' index.html \
 && npx vite build --outDir /out --emptyOutDir

# Stage 2: serve with nginx; /api/* is proxied to the KAYAR backend (Zite)
FROM nginx:1.27-alpine
ENV BACKEND_HOST=ma8nxe5agt.zite.so
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY deploy/15-kayar-upstream.sh /docker-entrypoint.d/15-kayar-upstream.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/15-kayar-upstream.sh && chmod +x /docker-entrypoint.d/15-kayar-upstream.sh
COPY --from=build /out /usr/share/nginx/html
EXPOSE 80
