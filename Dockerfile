# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY apps/pwa/package.json apps/pwa/package.json
COPY apps/extension/package.json apps/extension/package.json
RUN npm ci

COPY . .
RUN npm run build:pwa

# ---- runtime ----
FROM nginx:1.27-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/pwa/dist /usr/share/nginx/html

EXPOSE 80
