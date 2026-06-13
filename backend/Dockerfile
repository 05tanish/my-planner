FROM node:20-alpine

# Install OpenSSL and libc compatibility layer for Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Install package dependencies
COPY package*.json ./
RUN npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy the rest of the source code and compile TS
COPY . .
RUN npm run build

EXPOSE 8080

# Run prisma migration/push on start and then start the server
CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
