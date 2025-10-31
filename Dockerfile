# Use official Node image
FROM node:18-slim

# Install required system libraries for Oracle Instant Client
RUN apt-get update && apt-get install -y libaio1 unzip curl

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the project
COPY . .

# Set Oracle library path
ENV LD_LIBRARY_PATH=/app/oracle_client/instantclient_23_26

# Expose app port (matches your .env PORT=3007)
EXPOSE 3007

# Start the server
CMD ["node", "src/server.js"]
