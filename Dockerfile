FROM node:22-alpine@sha256:8094c002d08262dba12645a3b4a15cd6cd627d30bc782f53229a2ec13ee22a00 AS build

WORKDIR /app
RUN mkdir dist

COPY package*.json ./

RUN npm ci

COPY rollup* ./
COPY *.md ./dist/
COPY src ./src

RUN npm run build


FROM gcr.io/distroless/nodejs22-debian12@sha256:8a3e96fe3345b5d83ecec2066e7c498139a02a6d1214e4f6c39f9ce359f3f5bc

ENV PORT=8080 \
    HOST=0.0.0.0 \
    NODE_ENV=production

EXPOSE ${PORT}

WORKDIR /app

COPY --from=build /app/dist .

USER 1000

CMD ["-r", "./monitor.cjs", "server.cjs"]
