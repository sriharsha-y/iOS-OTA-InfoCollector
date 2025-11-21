# iOS OTA Device Information Collector

A lightweight, privacy-focused web application for collecting iOS device information (UDID, IMEI, Serial Number, Device Model, iOS Version) using Over-The-Air (OTA) configuration profiles.

## Features

✅ **Zero Data Persistence** - Completely stateless, no database, no sessions
✅ **Privacy-First** - Device info shown once via query params, never stored
✅ **Docker Support** - One-command deployment with Docker Compose
✅ **QR Code Generation** - Easy mobile access via QR code
✅ **Certificate Flexibility** - Supports both Apple Developer and self-signed certificates
✅ **Configurable** - Single YAML file for all customization
✅ **Production Ready** - Security headers, rate limiting, input sanitization
✅ **Responsive UI** - Beautiful mobile-first interface

## Quick Start

### Prerequisites

- Node.js 18+ (for local development)
- Docker & Docker Compose (for containerized deployment)
- **HTTPS endpoint** (required for iOS profile installation in production)

### Option 1: Docker Deployment (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ios-ota-device-collector
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` file**
   ```bash
   # Set your public HTTPS URL
   BASE_URL=https://yourdomain.com
   PORT=3000
   ```

4. **Start the application**
   ```bash
   docker-compose up -d
   ```

5. **Access the application**
   - Open `https://yourdomain.com` in your browser
   - The QR code will be displayed for mobile access

### Option 2: Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and set BASE_URL
   ```

3. **Start the server**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

4. **Access the application**
   - Open `http://localhost:3000` in your browser

## Configuration

### Environment Variables

Edit `.env` file:

```bash
# REQUIRED: Your public URL (must be HTTPS in production)
BASE_URL=https://device-collector.yourdomain.com

# Optional: Server port (default: 3000)
PORT=3000

# Optional: Environment
NODE_ENV=production
```

### Application Configuration

Edit `config/config.yml` to customize:

```yaml
# Organization details
organization:
  name: "Your Organization Name"
  identifier: "com.yourorg.device-collector"
  displayName: "Device Registration"
  description: "Install this profile to register your device"

# Certificate configuration
certificate:
  useSelfSigned: true  # Set to false to use Apple Developer cert
  userCertPath: "./config/certs/developer.p12"
  userCertPassword: ""

# Branding
branding:
  title: "Install Device Profile"
  description: "This profile will collect your device information."
  primaryColor: "#0071e3"

# Security
security:
  rateLimit:
    windowMs: 900000  # 15 minutes
    maxRequests: 10
```

## Certificate Setup

### Option 1: Self-Signed Certificate (Default)

The application automatically generates a self-signed certificate on first run.

⚠️ **Note**: iOS will show an "Unsigned Profile" warning during installation, but the profile will still work.

### Option 2: Apple Developer Certificate (Recommended for Production)

1. **Export your certificate from Xcode/Keychain**
   - Open Keychain Access
   - Find your Apple Developer certificate
   - Right-click → Export → Save as `.p12` file

2. **Copy certificate to config directory**
   ```bash
   cp /path/to/your/certificate.p12 config/certs/developer.p12
   ```

3. **Update config.yml**
   ```yaml
   certificate:
     useSelfSigned: false
     userCertPath: "./config/certs/developer.p12"
     userCertPassword: "your-password-if-any"
   ```

4. **Restart the application**
   ```bash
   docker-compose restart
   # or
   npm start
   ```

## How It Works

### Data Flow

```
1. User visits landing page
2. Clicks "Install Profile" or scans QR code
3. iOS downloads .mobileconfig file
4. User installs profile from Settings
5. iOS sends device info to /capture endpoint
6. Server parses data and redirects to /display with query params
7. Display page shows device information
8. No data is stored anywhere (completely stateless)
```

### Privacy & Security

- **No Database**: Zero data persistence
- **No Sessions**: Stateless architecture
- **No Logging**: Device info never written to logs
- **Query Params**: Data passed once via URL, then discarded
- **HTTPS Only**: Enforced in production
- **Rate Limiting**: Prevents abuse (10 requests per 15 minutes)
- **Input Sanitization**: All data sanitized to prevent XSS

## HTTPS Setup

iOS requires HTTPS for configuration profile installation. Here are common options:

### Option 1: Reverse Proxy (Nginx)

```nginx
server {
    listen 443 ssl;
    server_name device-collector.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Option 2: ngrok (Development/Testing)

```bash
# Install ngrok
npm install -g ngrok

# Start ngrok tunnel
ngrok http 3000

# Copy the HTTPS URL to .env as BASE_URL
```

### Option 3: Cloudflare Tunnel

```bash
# Install cloudflared
# Follow: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/

cloudflared tunnel --url http://localhost:3000
```

## Troubleshooting

### Profile Installation Fails

**Symptom**: Profile downloads but won't install

**Solutions**:
- ✅ Ensure you're using HTTPS (not HTTP)
- ✅ Check certificate is valid
- ✅ Verify BASE_URL is set correctly in `.env`
- ✅ Try using Apple Developer certificate instead of self-signed

### No Device Data Received

**Symptom**: Profile installs but no data appears

**Solutions**:
- ✅ Check `/capture` endpoint is accessible from internet
- ✅ Verify firewall allows incoming connections
- ✅ Check server logs: `docker-compose logs -f`
- ✅ Ensure BASE_URL in config points to publicly accessible URL

### Certificate Errors

**Symptom**: Certificate-related errors on startup

**Solutions**:
- ✅ Delete `config/certs/self-signed*.pem` and restart (regenerates)
- ✅ If using user cert, verify `.p12` file path and password
- ✅ Check cert permissions: `chmod 644 config/certs/*`

## API Endpoints

- `GET /` - Landing page with installation button
- `GET /profile.mobileconfig` - Download signed configuration profile
- `POST /capture` - Receive device data from iOS (auto-called by iOS)
- `GET /display` - Display device information (query params)
- `GET /health` - Health check endpoint

## Development

### Project Structure

```
├── src/
│   ├── server.js              # Express server & routes
│   ├── config.js              # Configuration loader
│   ├── profileGenerator.js    # Generate .mobileconfig XML
│   ├── certSigner.js          # Certificate signing
│   └── views/
│       ├── index.html         # Landing page
│       └── display.html       # Results page
├── config/
│   ├── config.yml             # Application configuration
│   ├── .env                   # Environment variables
│   └── certs/                 # Certificates directory
├── public/                    # Static assets
├── Dockerfile
├── docker-compose.yml
└── package.json
```

### Running Tests

```bash
# Check health endpoint
curl http://localhost:3000/health

# Test profile download
curl -I http://localhost:3000/profile.mobileconfig
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Security

This application is designed with privacy and security in mind:

- No data persistence
- Input sanitization
- Rate limiting
- Security headers via Helmet.js
- HTTPS enforcement

**Important**: This tool is intended for legitimate device management purposes only. Always ensure you have proper authorization before collecting device information.

## Acknowledgments

- Inspired by the need for simple, privacy-focused iOS device information collection
- Built with Node.js, Express, and minimal dependencies
- Uses Apple's official Configuration Profile specification

## Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review existing GitHub issues
3. Open a new issue with detailed information

---

Made with ❤️ for the open source community
