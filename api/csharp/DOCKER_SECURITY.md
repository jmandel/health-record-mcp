# Docker Security Configuration

## Security Improvements Implemented

### 1. **Minimal Base Image**
- Using Alpine-based .NET runtime (`aspnet:8.0-alpine`) instead of Debian-based
- Reduces attack surface by ~200MB
- Fewer packages = fewer vulnerabilities

### 2. **Non-Root User**
- Application runs as user `appuser` (UID 1001, GID 1001)
- Never runs as root inside container
- Reduces privilege escalation risks

### 3. **Read-Only File System**
- Application files have minimal permissions (550 for directories, 440 for files)
- Can enable read-only root filesystem with tmpfs mounts for temp directories

### 4. **Dropped Capabilities**
- Drops ALL Linux capabilities by default
- Only adds `NET_BIND_SERVICE` if needed
- Follows principle of least privilege

### 5. **Security Options**
- `no-new-privileges:true` - Prevents privilege escalation
- Specific version pinning for reproducibility
- Regular security updates via `apk upgrade`

### 6. **Resource Limits**
- CPU: 1.0 cores max, 0.5 reserved
- Memory: 512MB max, 256MB reserved
- Prevents DoS via resource exhaustion

### 7. **Health Checks**
- Built-in health check endpoint
- Auto-restart on failure
- Monitoring readiness

### 8. **Secrets Management**
- `.dockerignore` excludes sensitive files
- No secrets in image layers
- Use Docker secrets or environment variables
- Never commit secrets to git

### 9. **Logging Configuration**
- Log rotation (10MB max, 3 files)
- Prevents disk exhaustion
- Easy audit trail

### 10. **Network Security**
- Single exposed port (5000)
- Removed HTTPS port from container (handle with reverse proxy)
- Can use encrypted overlay networks

## Building the Secure Image

```bash
# Build the image
docker build -t familyhealth-api:latest .

# Run with docker-compose (includes all security settings)
docker-compose up -d

# Or run manually with security options
docker run -d \
  --name familyhealth-api \
  --security-opt=no-new-privileges:true \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  --read-only \
  --tmpfs /tmp:size=100M,mode=1777 \
  -p 5000:5000 \
  -e OUR_HEALTHS_POSTGRES_CONNECTION_STRING="your-connection-string" \
  familyhealth-api:latest
```

## Scanning for Vulnerabilities

```bash
# Using Docker Scout (built into Docker Desktop)
docker scout cves familyhealth-api:latest

# Using Trivy
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image familyhealth-api:latest

# Using Grype
grype familyhealth-api:latest
```

## Production Deployment Recommendations

### 1. **Use Docker Secrets**
```yaml
services:
  api:
    secrets:
      - db_connection_string
    environment:
      - OUR_HEALTHS_POSTGRES_CONNECTION_STRING_FILE=/run/secrets/db_connection_string

secrets:
  db_connection_string:
    external: true
```

### 2. **Enable Read-Only Root Filesystem**
```yaml
read_only: true
tmpfs:
  - /tmp:size=100M,mode=1777
  - /app/temp:size=50M,uid=1001,gid=1001
```

### 3. **Use Reverse Proxy for HTTPS**
- Nginx, Traefik, or cloud load balancer
- Let container handle HTTP only
- Terminate SSL/TLS at the edge

### 4. **Network Isolation**
```yaml
networks:
  frontend:
    external: true
  backend:
    internal: true  # No external access
```

### 5. **Regular Updates**
- Pin specific versions but update regularly
- Monitor CVE databases
- Automate security scanning in CI/CD

### 6. **AppArmor/SELinux Profiles**
```yaml
security_opt:
  - apparmor=docker-default
  - no-new-privileges:true
```

### 7. **User Namespace Remapping**
Enable in Docker daemon:
```json
{
  "userns-remap": "default"
}
```

## Security Checklist

- [ ] No secrets in image layers (check with `docker history`)
- [ ] Non-root user (verify with `docker exec <container> whoami`)
- [ ] Minimal base image (Alpine)
- [ ] All capabilities dropped except necessary
- [ ] Resource limits configured
- [ ] Health checks enabled
- [ ] Read-only root filesystem (if possible)
- [ ] Security scanning in CI/CD pipeline
- [ ] TLS termination at reverse proxy
- [ ] Docker secrets for sensitive data
- [ ] Regular image updates
- [ ] Audit logs enabled

## Verifying Security

```bash
# Check user
docker exec familyhealth-api whoami
# Should output: appuser

# Check capabilities
docker exec --privileged familyhealth-api capsh --print
# Should show minimal capabilities

# Check file permissions
docker exec familyhealth-api ls -la /app
# Should show restrictive permissions

# Check for secrets in layers
docker history familyhealth-api:latest --no-trunc
# Should not contain sensitive data
```

## References

- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [OWASP Container Security](https://owasp.org/www-project-docker-top-10/)
- [.NET Container Security](https://learn.microsoft.com/en-us/dotnet/core/docker/security)
