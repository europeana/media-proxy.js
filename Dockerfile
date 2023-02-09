FROM node:16-alpine AS base

WORKDIR /app

COPY package*.json *.md ./

RUN npm ci --omit dev

COPY src ./src


FROM gcr.io/distroless/nodejs:16

ENV PORT=8080 \
    HOST=0.0.0.0 \
    NODE_ENV=production

EXPOSE ${PORT}

WORKDIR /app

COPY --from=base /app .

USER 1000

CMD ["src/server.js"]
