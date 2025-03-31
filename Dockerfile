# Use the official Bun image
FROM oven/bun:latest

# Set the working directory
WORKDIR /app

# Copy package.json and bun.lock
COPY package.json bun.lock ./

# Install dependencies (use --production if you don't need devDependencies)
# Using --frozen-lockfile is recommended for reproducible builds
RUN bun install --frozen-lockfile

# Copy the application code
COPY index.ts .

# Expose the port the server will run on (default 3001 or MCP_SERVER_PORT)
# Note: This doesn't actually map the port, just documents it. Use -p in `docker run`.
EXPOSE 3001

# Define the entry point
ENTRYPOINT [ "bun", "run", "index.ts" ]
