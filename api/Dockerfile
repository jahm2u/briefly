FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine

# Set timezone to match the application's expected timezone
ENV TZ=America/Sao_Paulo
RUN apk add --no-cache tzdata icu-data-full && \
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/lib ./lib

# Environment variables are loaded from the mounted .env file
# No hardcoded environment variables to ensure better configurability

# Expose the application port
EXPOSE 5100

# Start the application
CMD ["node", "dist/src/main.js"]