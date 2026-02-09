FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build-time args from DigitalOcean App Platform
ARG VITE_API_BASE_URL
ARG VITE_UNSPLASH_ACCESS_KEY

# Export as ENV so Vite can read them during build
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_UNSPLASH_ACCESS_KEY=$VITE_UNSPLASH_ACCESS_KEY

# Debug: verify vars are injected (check DO build logs, remove after confirming)
RUN echo "=== BUILD ENV CHECK ===" && echo "API=$VITE_API_BASE_URL" && echo "UNSPLASH=${VITE_UNSPLASH_ACCESS_KEY:+SET}"

RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
