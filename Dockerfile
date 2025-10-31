# Use official Node.js slim image
FROM node:18-slim

# Install dependencies required for Oracle Instant Client
RUN apt-get update && apt-get install -y \
    libaio1 \
    unzip \
    curl \
    python3 \
    make \
    g++ \
 && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package.json first and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your app code
COPY . .

# ✅ Copy Oracle Instant Client into image
COPY oracle_client ./oracle_client

# ✅ Set library path for Oracle Instant Client
ENV LD_LIBRARY_PATH=/app/oracle_client/instantclient_23_26

# ✅ Set Node environment and app port
ENV NODE_ENV=production
ENV PORT=3007

EXPOSE 3007

# Run the Node app
CMD ["node", "src/server.js"]
