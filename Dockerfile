FROM node:18-alpine AS build

WORKDIR /app
RUN mkdir dist

COPY package*.json ./

RUN npm ci

COPY rollup* ./
COPY *.md ./dist/
COPY src ./src

RUN npm run build


FROM gcr.io/distroless/nodejs:18

ENV PORT=8080 \
    HOST=0.0.0.0 \
    NODE_ENV=production

EXPOSE ${PORT}

WORKDIR /app

COPY --from=build /app/dist .

USER 1000

CMD ["-r", "monitor.cjs", "server.cjs"]
