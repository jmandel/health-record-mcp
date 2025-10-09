# Build stage - use specific version for reproducibility
FROM mcr.microsoft.com/dotnet/sdk:8.0.404-alpine3.20 AS build

# Set build arguments for reproducible builds
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=1.0.0

WORKDIR /src

# Copy only project files first for better layer caching
COPY ["FamilyHealthApi/FamilyHealthApi.csproj", "FamilyHealthApi/"]
RUN dotnet restore "FamilyHealthApi/FamilyHealthApi.csproj" \
    --runtime linux-musl-x64

# Copy source code
COPY . .
WORKDIR "/src/FamilyHealthApi"

# Build with optimizations and self-contained
RUN dotnet publish "FamilyHealthApi.csproj" \
    -c Release \
    -o /app/publish \
    --runtime linux-musl-x64 \
    --self-contained false \
    --no-restore \
    /p:PublishTrimmed=false \
    /p:PublishSingleFile=false

# Final runtime stage - use minimal Alpine-based runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0.10-alpine3.20 AS final

# Add OCI labels for security and traceability
LABEL org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.title="Family Health API" \
      org.opencontainers.image.description="Secure Family Health Records REST API" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.vendor="Our Healths Platform" \
      org.opencontainers.image.licenses="MIT" \
      maintainer="Our Healths Platform"

# Install security updates and required packages
RUN apk upgrade --no-cache && \
    apk add --no-cache \
    # Required for .NET globalization
    icu-libs \
    # Security tools
    ca-certificates \
    # Minimal wget for health checks
    wget && \
    # Clean up
    rm -rf /var/cache/apk/* /tmp/*

# Create non-root user with specific UID/GID and no shell/home
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S -D -H -s /sbin/nologin appuser -G appgroup

WORKDIR /app

# Copy published files with correct ownership
COPY --from=build --chown=appuser:appgroup /app/publish .

# Set secure file permissions - read and execute for app, no write
RUN chmod -R 550 /app && \
    chmod 440 /app/*.dll /app/*.json 2>/dev/null || true && \
    # Ensure no sensitive files are readable
    find /app -type f -name "*.pdb" -delete 2>/dev/null || true

# Switch to non-root user before any further operations
USER appuser

# Set environment variables for security and hardening
ENV ASPNETCORE_URLS=http://+:5000 \
    DOTNET_RUNNING_IN_CONTAINER=true \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false \
    ASPNETCORE_ENVIRONMENT=Production \
    # Security hardening
    DOTNET_EnableDiagnostics=0 \
    DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    ASPNETCORE_HTTPS_PORT="" \
    COMPlus_EnableDiagnostics=0

# Use non-root port
EXPOSE 5000

# Health check with improved security
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider --timeout=2 http://localhost:5000/health || exit 1

# Add security-related metadata
LABEL security.scan="enabled" \
      security.non-root="true" \
      security.readonly-rootfs="supported"

# Entrypoint with hardening options
ENTRYPOINT ["dotnet", "FamilyHealthApi.dll"]
