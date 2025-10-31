FROM node:18-slim

# Install required system libraries
RUN apt-get update && apt-get install -y libaio1 unzip curl

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all code
COPY . .

# Set Oracle client environment variable
ENV LD_LIBRARY_PATH=/app/oracle_client/instantclient_23_26

# Expose your app’s port
EXPOSE 3007

# Start the app
CMD ["node", "src/server.js"]
