### Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install all dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema

# Copy all source files
COPY . .

# Build the application
RUN npm run build

# Verify the build output exists
RUN ls -la dist/

### Stage 2: Production
FROM node:22-alpine
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Copy Prisma schema
COPY prisma ./prisma

# Install production dependencies only
RUN npm ci --only=production

# Generate Prisma client for production
RUN npx prisma generate --schema=./prisma/schema

# Copy built application from builder stage
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/service_account.json ./service_account.json

# Verify files were copied
RUN ls -la dist/

# Expose port
EXPOSE 8080

# Start application
CMD ["node", "dist/src/main.js"]
