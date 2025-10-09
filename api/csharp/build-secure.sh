#!/bin/bash
# Secure Docker Build Script for Family Health API
# This script builds the Docker image with security best practices

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="${IMAGE_NAME:-family-health-api}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
VERSION=$(git describe --tags --always 2>/dev/null || echo "1.0.0")

echo -e "${GREEN}=== Secure Docker Build ===${NC}"
echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "Build Date: ${BUILD_DATE}"
echo "VCS Ref: ${VCS_REF}"
echo "Version: ${VERSION}"
echo ""

# Step 1: Build the image
echo -e "${YELLOW}Step 1: Building Docker image...${NC}"
docker build \
  --build-arg BUILD_DATE="${BUILD_DATE}" \
  --build-arg VCS_REF="${VCS_REF}" \
  --build-arg VERSION="${VERSION}" \
  --no-cache \
  -t "${IMAGE_NAME}:${IMAGE_TAG}" \
  -f Dockerfile \
  . || {
    echo -e "${RED}Build failed!${NC}"
    exit 1
  }

echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Step 2: Scan for vulnerabilities
echo -e "${YELLOW}Step 2: Scanning for vulnerabilities...${NC}"

# Check if Trivy is installed
if command -v trivy &> /dev/null; then
    echo "Running Trivy scan..."
    trivy image \
      --severity HIGH,CRITICAL \
      --exit-code 0 \
      "${IMAGE_NAME}:${IMAGE_TAG}" || {
        echo -e "${YELLOW}Warning: Vulnerabilities found${NC}"
      }
    echo ""
else
    echo -e "${YELLOW}Trivy not installed. Install with: brew install trivy${NC}"
fi

# Check if Docker Scout is available
if command -v docker-scout &> /dev/null || docker scout version &> /dev/null; then
    echo "Running Docker Scout scan..."
    docker scout cves "${IMAGE_NAME}:${IMAGE_TAG}" || {
        echo -e "${YELLOW}Warning: Scout scan completed with findings${NC}"
      }
    echo ""
else
    echo -e "${YELLOW}Docker Scout not available${NC}"
fi

# Step 3: Verify image configuration
echo -e "${YELLOW}Step 3: Verifying security configuration...${NC}"

# Check if running as non-root
USER_CHECK=$(docker inspect "${IMAGE_NAME}:${IMAGE_TAG}" -f '{{.Config.User}}')
if [ "$USER_CHECK" = "appuser" ] || [ "$USER_CHECK" = "1001" ]; then
    echo -e "${GREEN}✓ Running as non-root user${NC}"
else
    echo -e "${RED}✗ Warning: Not running as non-root user${NC}"
fi

# Check exposed ports
EXPOSED_PORTS=$(docker inspect "${IMAGE_NAME}:${IMAGE_TAG}" -f '{{range $key, $value := .Config.ExposedPorts}}{{$key}} {{end}}')
if [[ "$EXPOSED_PORTS" =~ "5000" ]]; then
    echo -e "${GREEN}✓ Using non-privileged port${NC}"
fi

# Check healthcheck
HEALTHCHECK=$(docker inspect "${IMAGE_NAME}:${IMAGE_TAG}" -f '{{.Config.Healthcheck}}')
if [ "$HEALTHCHECK" != "<nil>" ]; then
    echo -e "${GREEN}✓ Health check configured${NC}"
else
    echo -e "${RED}✗ Warning: No health check configured${NC}"
fi

echo ""

# Step 4: Test the container
echo -e "${YELLOW}Step 4: Testing container startup...${NC}"

# Start container in test mode
TEST_CONTAINER="test-${IMAGE_NAME}-$$"
docker run -d \
  --name "${TEST_CONTAINER}" \
  --rm \
  -e OUR_HEALTHS_POSTGRES_CONNECTION_STRING="Host=localhost;Database=test;Username=test;Password=test" \
  "${IMAGE_NAME}:${IMAGE_TAG}" &> /dev/null || {
    echo -e "${RED}Container failed to start${NC}"
    exit 1
  }

# Wait for container to be healthy
sleep 5

# Check if container is running
if docker ps --filter "name=${TEST_CONTAINER}" --format '{{.Names}}' | grep -q "${TEST_CONTAINER}"; then
    echo -e "${GREEN}✓ Container started successfully${NC}"
    
    # Check process user
    RUNNING_USER=$(docker exec "${TEST_CONTAINER}" whoami 2>/dev/null || echo "unknown")
    if [ "$RUNNING_USER" = "appuser" ]; then
        echo -e "${GREEN}✓ Running as non-root user (${RUNNING_USER})${NC}"
    else
        echo -e "${RED}✗ Warning: Running as ${RUNNING_USER}${NC}"
    fi
    
    # Stop test container
    docker stop "${TEST_CONTAINER}" &> /dev/null
else
    echo -e "${RED}✗ Container not running${NC}"
    docker logs "${TEST_CONTAINER}" 2>/dev/null || true
    docker stop "${TEST_CONTAINER}" &> /dev/null || true
    exit 1
fi

echo ""

# Step 5: Generate SBOM (Software Bill of Materials)
echo -e "${YELLOW}Step 5: Generating SBOM...${NC}"
if command -v syft &> /dev/null; then
    syft "${IMAGE_NAME}:${IMAGE_TAG}" -o json > "sbom-${IMAGE_TAG}.json"
    echo -e "${GREEN}✓ SBOM saved to sbom-${IMAGE_TAG}.json${NC}"
elif command -v docker &> /dev/null && docker sbom --help &> /dev/null; then
    docker sbom "${IMAGE_NAME}:${IMAGE_TAG}" > "sbom-${IMAGE_TAG}.json"
    echo -e "${GREEN}✓ SBOM saved to sbom-${IMAGE_TAG}.json${NC}"
else
    echo -e "${YELLOW}SBOM tools not installed. Install syft: brew install syft${NC}"
fi

echo ""

# Summary
echo -e "${GREEN}=== Build Complete ===${NC}"
echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""
echo "Next steps:"
echo "1. Push to registry: docker push ${IMAGE_NAME}:${IMAGE_TAG}"
echo "2. Deploy to K8s: kubectl apply -f k8s/"
echo "3. Monitor for vulnerabilities: trivy image ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""
echo -e "${YELLOW}Security Reminders:${NC}"
echo "- Never include secrets in the image"
echo "- Use Kubernetes secrets for sensitive data"
echo "- Enable Pod Security Standards in your cluster"
echo "- Configure network policies"
echo "- Enable read-only root filesystem in K8s"
echo "- Set resource limits"
echo ""
