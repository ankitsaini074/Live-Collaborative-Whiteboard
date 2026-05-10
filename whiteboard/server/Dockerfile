# Use the official Node.js image as the base image
FROM node:18

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package files from server workspace
COPY server/package.json server/package-lock.json ./

# Install dependencies
RUN npm install

# Copy server source code
COPY server/ ./

# Copy shared workspace used by sync:shared (expects ../shared/types.ts)
COPY shared /usr/src/shared

# Build the TypeScript code
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
