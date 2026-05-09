FROM node:20-alpine

WORKDIR /app

# Copy shared types from repo root (build context is repo root)
COPY shared ./shared

# Copy server files
COPY whiteboard/server/package*.json ./
RUN npm install

COPY whiteboard/server ./

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 10000

# Start the server
CMD ["npm", "start"]
