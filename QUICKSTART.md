# Quick Start Guide

Get up and running in less than 2 minutes!

## Fastest Way (Docker)

```bash
# 1. Set your public URL
echo "BASE_URL=https://yourdomain.com" > .env

# 2. Start the application
docker-compose up -d

# 3. Done! Access at https://yourdomain.com
```

## Local Development

```bash
# 1. Install dependencies (first time only)
npm install

# 2. Start the server
npm start

# 3. Open http://localhost:3000
```

## For Testing with iOS

You need HTTPS for iOS to install profiles. Easy options:

### Option 1: ngrok (Fastest)
```bash
# Install
npm install -g ngrok

# Start tunnel
ngrok http 3000

# Copy the https://xxxx.ngrok-free.app URL
# Update .env:
echo "BASE_URL=https://xxxx.ngrok-free.app" > .env

# Restart server
npm start
```

### Option 2: Cloudflare Tunnel
```bash
cloudflared tunnel --url http://localhost:3000
```

## Next Steps

1. **Customize branding**: Edit `config/config.yml`
2. **Use your Apple Developer cert**: Place `.p12` in `config/certs/`
3. **Read full docs**: See `README.md`

## Troubleshooting

### Profile won't install on iOS
- Make sure you're using HTTPS (not HTTP)
- Check that BASE_URL is correct in .env
- Try on iOS 16+ device

### Certificate errors
- Delete `config/certs/self-signed*` files
- Restart the server (auto-regenerates)

### Docker build fails
- Ensure Docker is running
- Try: `docker-compose down && docker-compose up --build`

For more help, see README.md or open an issue on GitHub.
