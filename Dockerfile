FROM node:18-slim

# Install system dependencies
RUN apt-get update && apt-get install -y libaio1 unzip curl

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the code
COPY . .

# Set environment variable for Oracle Client path
ENV LD_LIBRARY_PATH=/app/oracle_client/instantclient_23_26

# Expose the backend port
EXPOSE 3007

# Start the app
CMD ["node", "src/server.js"]
