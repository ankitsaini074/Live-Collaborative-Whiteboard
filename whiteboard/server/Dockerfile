# Server Dockerfile — Node.js + Express + Socket.io

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy shared types and source files
COPY ../../shared /app/shared
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3001

# Start the server
CMD ["npm", "start"]
