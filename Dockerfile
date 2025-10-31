FROM node:18-slim

RUN apt-get update && apt-get install -y libaio1 unzip curl

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ENV LD_LIBRARY_PATH=/app/oracle_client/instantclient_23_26
EXPOSE 3007
CMD ["node", "src/server.js"]
