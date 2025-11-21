# CLAUDE.md - Project Memory & Architecture

## Project Overview

**iOS OTA Device Information Collector** is a lightweight, privacy-focused web application that collects iOS device information using Apple's Over-The-Air (OTA) configuration profile mechanism.

## Key Design Decisions

### 1. Stateless Architecture

**Decision**: No database, no sessions, no in-memory storage

**Rationale**:
- Maximum privacy - no data persistence anywhere
- Simpler deployment - no database setup required
- Lower resource usage - minimal memory footprint
- Easier maintenance - fewer moving parts
- Better for open source - easier for users to trust

**Implementation**:
- Device data passed via query parameters after capture
- Data shown once to user, then discarded
- No server logs contain device information

### 2. Technology Stack

**Decision**: Node.js + Express

**Rationale**:
- JavaScript is most accessible for open source contributors
- Large ecosystem with mature libraries
- Easy for users to customize and understand
- Lower barrier to entry than Go/Rust
- Rich tooling for web applications

**Trade-offs Accepted**:
- Slightly larger Docker image (~50MB vs Go's ~10MB)
- Dependencies required (node_modules)
- But gained: accessibility, maintainability, contributor pool

### 3. Certificate Handling

**Decision**: Support both self-signed and Apple Developer certificates

**Rationale**:
- Self-signed: Easy development/testing, no Apple Developer account needed
- User-provided: Professional deployment, no iOS warnings
- Flexibility: Users choose based on their needs

**Implementation**:
- Auto-generate self-signed cert on first run
- Store in `config/certs/` directory
- Support .p12 import for Apple Developer certs
- Graceful fallback to self-signed if user cert fails

### 4. Configuration System

**Decision**: YAML + Environment Variables

**Rationale**:
- YAML: Human-readable, supports comments, structured
- ENV vars: Override for deployment-specific settings (BASE_URL, PORT)
- Separation: Config file for app settings, env for deployment

**Pattern**:
- `config.yml`: Application settings (branding, org info, certificate)
- `.env`: Deployment settings (BASE_URL, PORT, NODE_ENV)
- ENV vars take precedence over YAML

## Architecture

### Data Flow

```
┌─────────────┐
│  iOS Device │
└──────┬──────┘
       │ 1. User visits landing page
       ▼
┌─────────────┐
│   GET /     │  Landing page with QR code
└──────┬──────┘
       │ 2. User clicks "Install Profile"
       ▼
┌──────────────────────┐
│ GET /profile.mobileconfig │
│  - Generate XML      │
│  - Sign with cert    │
│  - Serve to iOS      │
└──────┬───────────────┘
       │ 3. iOS downloads profile
       │ 4. User installs from Settings
       ▼
┌─────────────┐
│ POST /capture│  iOS sends device data (plist XML)
│  - Parse XML │
│  - Sanitize  │
│  - Redirect  │
└──────┬──────┘
       │ 5. 301 Redirect with query params
       ▼
┌─────────────────────┐
│ GET /display?udid=...│  Display device info
│  - Read params       │
│  - Show to user      │
│  - No storage        │
└─────────────────────┘
```

### File Structure

```
src/
├── server.js           # Main Express app with all routes
├── config.js           # Config loader (YAML + ENV)
├── profileGenerator.js # Generate .mobileconfig XML
├── certSigner.js       # Certificate signing utilities
└── views/
    ├── index.html      # Landing page template
    └── display.html    # Results page template

config/
├── config.yml          # Application configuration
├── .env               # Environment variables
└── certs/             # Certificates directory
    ├── self-signed.pem      # Auto-generated
    ├── self-signed-key.pem  # Auto-generated
    └── developer.p12        # User-provided (optional)
```

## Security Considerations

### 1. Input Sanitization

**Threat**: XSS via device data injection

**Mitigation**:
- All device data sanitized before display
- Remove `<>'"` characters
- Regex validation for UDID format
- No eval() or innerHTML usage

### 2. Rate Limiting

**Threat**: Abuse of /capture endpoint

**Mitigation**:
- Express rate limiter: 10 requests per 15 minutes
- Prevents automated scraping/abuse
- Configurable via config.yml

### 3. HTTPS Enforcement

**Threat**: MITM attacks, iOS rejection

**Mitigation**:
- Warning displayed if HTTP in production
- Documentation emphasizes HTTPS requirement
- iOS requires HTTPS for profile installation

### 4. No Data Persistence

**Threat**: Data breaches, privacy violations

**Mitigation**:
- Zero database storage
- No session storage
- No server-side logging of device info
- Data shown once via query params, then gone

## Certificate Signing Details

### Self-Signed Certificate

**Generation**:
- RSA 2048-bit keys
- SHA-256 signature
- 10-year validity
- Generated via node-forge

**Storage**:
- PEM format in `config/certs/`
- Persisted across restarts
- Regenerated if corrupted/missing

**iOS Behavior**:
- Shows "Unsigned Profile" warning
- Still installable
- Works on iOS 16+

### Apple Developer Certificate

**Format**: PKCS#12 (.p12)

**Extraction**:
- Certificate and private key from .p12
- Uses node-forge PKCS#12 parser
- Password protection supported

**iOS Behavior**:
- No warnings (if valid)
- Professional appearance
- Requires Apple Developer account ($99/year)

## Deployment Scenarios

### 1. Docker (Recommended)

**Pros**:
- Isolated environment
- Consistent across systems
- Easy updates
- Health checks built-in

**Setup**:
```bash
docker-compose up -d
```

### 2. Reverse Proxy (Production)

**Recommended Stack**:
- Nginx/Caddy for HTTPS termination
- Docker container behind proxy
- Let's Encrypt for SSL

**Benefits**:
- Automatic HTTPS
- Better performance
- Multiple apps on same server

### 3. Cloud Platforms

**Compatible With**:
- DigitalOcean App Platform
- Heroku
- Railway
- Render
- AWS ECS
- Google Cloud Run

**Requirements**:
- Persistent volume for `config/certs/`
- Environment variable support
- HTTPS endpoint

## Common Issues & Solutions

### Issue 1: Profile Won't Install

**Symptoms**: Downloads but installation fails

**Causes**:
- Using HTTP instead of HTTPS
- Invalid certificate
- Wrong BASE_URL

**Debug**:
```bash
# Check config
curl http://localhost:3000/health

# Verify certificate
openssl x509 -in config/certs/self-signed.pem -text -noout

# Test profile generation
curl -I http://localhost:3000/profile.mobileconfig
```

### Issue 2: No Data Received

**Symptoms**: Profile installs, but /display shows nothing

**Causes**:
- /capture endpoint not accessible from internet
- Firewall blocking incoming requests
- BASE_URL misconfigured

**Debug**:
```bash
# Test capture endpoint
curl -X POST http://localhost:3000/capture \
  -H "Content-Type: text/xml" \
  -d '<plist><dict><key>UDID</key><string>test</string></dict></plist>'

# Check logs
docker-compose logs -f
```

### Issue 3: Certificate Errors

**Symptoms**: "Error signing profile" messages

**Solution**:
```bash
# Regenerate self-signed cert
rm config/certs/self-signed*
docker-compose restart

# Or check user cert
openssl pkcs12 -info -in config/certs/developer.p12
```

## Future Enhancement Ideas

### Potential Features (Not Implemented)

1. **Admin Dashboard**: View collection history (requires database)
2. **Webhook Support**: POST data to external services
3. **Multi-language Support**: i18n for UI
4. **Custom Themes**: More branding options
5. **Export to CSV**: Batch export capability
6. **Email Delivery**: Email device info to user
7. **Analytics**: Device type statistics

**Why Not Included**:
- Keeps project simple and focused
- Avoids feature bloat
- Maintains privacy-first approach
- Easy for users to fork and add if needed

## Contributing Guidelines

### Code Style

- Use ES6+ features
- Async/await over callbacks
- Clear variable names
- Comments for complex logic
- No semicolons (consistent with existing code)

### Testing Before PR

1. Test basic flow (install → capture → display)
2. Test with both certificate types
3. Verify Docker build works
4. Check HTTPS works with ngrok
5. Run on iOS 16+ device

### Documentation

- Update README for user-facing changes
- Update CLAUDE.md for architecture changes
- Add inline comments for complex code
- Include examples in PR description

## Maintenance Notes

### Dependencies to Watch

- `node-forge`: Certificate operations (check for CVEs)
- `express`: Web framework (major version changes)
- `helmet`: Security headers (keep updated)
- `plist`: XML parsing (breaking changes rare)

### Update Strategy

```bash
# Check for outdated packages
npm outdated

# Update minor/patch versions
npm update

# Update major versions carefully
npm install package@latest
# Test thoroughly before committing
```

### Docker Image Updates

```bash
# Update base image regularly
FROM node:18-alpine  # Change to node:20-alpine when stable

# Check for security updates
docker scan ios-ota-collector
```

## Performance Characteristics

### Resource Usage

- **Memory**: ~50MB idle, ~100MB under load
- **CPU**: Minimal (certificate signing is main cost)
- **Disk**: ~100MB (includes node_modules)
- **Network**: Negligible (small payloads)

### Scaling

**Current Design**: Single instance, stateless

**Scaling Options**:
- Horizontal: Multiple containers behind load balancer
- No database = easy horizontal scaling
- No sticky sessions needed

**Bottlenecks**:
- Certificate signing (CPU-bound)
- QR code generation (minimal)

**Optimizations Applied**:
- Multi-stage Docker build
- Alpine Linux base
- Production-only dependencies
- No unnecessary middleware

## License & Legal

**License**: MIT

**Usage Rights**:
- Free for commercial use
- Free for private use
- Can modify and distribute
- No warranty provided

**Important**:
- Tool must be used for legitimate purposes only
- Users must have authorization to collect device info
- Compliance with local privacy laws is user's responsibility

## Contact & Support

For issues, questions, or contributions:
1. GitHub Issues (preferred)
2. Pull Requests welcome
3. Discussions for questions

---

**Last Updated**: 2025-01-21
**Version**: 1.0.0
**Maintainer**: Open Source Community
