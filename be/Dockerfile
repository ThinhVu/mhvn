# https://github.com/uNetworking/uWebSockets.js/discussions/158
# Stage 1: Build Stage
FROM node:20-alpine as builder

RUN ln -s /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2

# Set the working directory
WORKDIR /app

# Copy package.json and pnpm-lock.json
COPY package*.json ./
COPY yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy the rest of the app's source code
COPY . .

# Build
RUN yarn build

# Stage 2: Runtime Stage
FROM node:20-alpine as runner

RUN ln -s /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2

# Set the working directory
WORKDIR /app

# Set production env
ENV NODE_ENV=production

# Copy only the necessary artifacts from the build stage
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/build ./dist

# Install production dependencies only
RUN yarn install --frozen-lockfile --production

# Expose the necessary port(s) for your app
ENV API_PORT=4000
EXPOSE 4000

# Start the Node.js application
ENTRYPOINT ["/bin/sh", "-c" , "node ./dist/index.js"]