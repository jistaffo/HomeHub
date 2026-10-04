FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
# Mount a persistent volume here so lists survive redeploys.
ENV DATA_FILE=/data/top10.json
RUN mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 4100
USER node
CMD ["node", "server.js"]
