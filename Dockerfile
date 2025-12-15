# Use Node.js LTS Alpine for smaller image size
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application source files
COPY server.js ./
COPY tools.js ./
COPY functions.js ./

# Expose the application port
EXPOSE 3000

# Set environment variable for production
ENV NODE_ENV=production

# Run the server
CMD ["node", "server.js"]
