FROM node:24-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS build

WORKDIR /app
RUN mkdir dist

COPY package*.json ./

RUN npm ci

COPY rollup* ./
COPY *.md ./dist/
COPY src ./src

RUN npm run build


FROM gcr.io/distroless/nodejs24-debian13@sha256:c23cc7262662efd642cd9c9d61783d10f600321f7bafdd37c8a82365ffaa2aa6

ENV PORT=8080 \
    HOST=0.0.0.0 \
    NODE_ENV=production

EXPOSE ${PORT}

WORKDIR /app

COPY --from=build /app/dist .

USER 1000

CMD ["-r", "./monitor.cjs", "server.cjs"]
