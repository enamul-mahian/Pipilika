# Pipilika — production image (works on Railway, Render, Fly, any VPS with Docker)
FROM node:22-slim
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
ENV NODE_ENV=production PORT=3000 UPLOAD_DIR=/data/storage
EXPOSE 3000
# Applies database migrations, then starts the site.
CMD ["npm", "run", "start:prod"]
