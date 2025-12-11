FROM node:18-alpine

# Workspace directory
WORKDIR /app

# Copy package info
COPY package*.json ./

# Install Dependencies
RUN npm install

# Copy source code
COPY . .

# Exposure
EXPOSE 3000

# Start command
CMD ["node", "server.js"]
