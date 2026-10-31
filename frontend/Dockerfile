# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts && npm rebuild sharp esbuild
COPY . .
ARG VITE_SITE_URL=https://offlineshelf.ahmershah.dev
ENV VITE_SITE_URL=$VITE_SITE_URL
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.31-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 8080
