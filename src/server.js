const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');

const config = require('./config');
const CertificateSigner = require('./certSigner');
const ProfileGenerator = require('./profileGenerator');

const app = express();
const PORT = config.server.port;

// Initialize certificate signer and profile generator
const certSigner = new CertificateSigner(config);
const profileGen = new ProfileGenerator(config);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts for simplicity
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimit?.windowMs || 900000, // 15 minutes
  max: config.security.rateLimit?.maxRequests || 10,
  message: 'Too many requests, please try again later.'
});

// Parse raw body for iOS POST data
app.use('/capture', express.raw({ type: 'application/x-apple-aspen-config', limit: '10kb' }));
app.use('/capture', express.raw({ type: 'text/xml', limit: '10kb' }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

/**
 * ROUTE: GET / - Landing page with install button and QR code
 */
app.get('/', async (req, res) => {
  try {
    const installUrl = `${config.server.baseUrl}/profile.mobileconfig`;

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(installUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    const html = fs.readFileSync(path.join(__dirname, 'views/index.html'), 'utf8')
      .replace(/{{TITLE}}/g, config.branding.title || 'Install Device Profile')
      .replace(/{{DESCRIPTION}}/g, config.branding.description || 'This profile will collect your device information.')
      .replace(/{{PRIMARY_COLOR}}/g, config.branding.primaryColor || '#0071e3')
      .replace(/{{INSTALL_URL}}/g, installUrl)
      .replace(/{{QR_CODE}}/g, qrCodeDataUrl);

    res.send(html);
  } catch (error) {
    console.error('Error rendering index page:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * ROUTE: GET /profile.mobileconfig - Generate and serve signed configuration profile
 *
 * Note: Profile is generated fresh on EVERY request (not cached):
 * - New UUID generated each time
 * - XML built dynamically with current config
 * - Signed on-the-fly with certificate (~50-100ms CPU cost)
 * This ensures profiles always reflect latest config and have unique UUIDs
 */
app.get('/profile.mobileconfig', (req, res) => {
  try {
    // Generate profile XML (fresh every time)
    const profileXml = profileGen.generateProfile();

    // Sign the profile (fresh every time)
    const signedProfile = certSigner.signProfile(profileXml);

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/x-apple-aspen-config');
    res.setHeader('Content-Disposition', `attachment; filename="${profileGen.getFilename()}"`);

    res.send(signedProfile);
    console.log('📱 Profile downloaded by client:', req.ip);
  } catch (error) {
    console.error('Error generating profile:', error);
    res.status(500).send('Error generating configuration profile');
  }
});

/**
 * ROUTE: POST /capture - Receive device information from iOS
 * Apply rate limiting to prevent abuse
 */
app.post('/capture', limiter, (req, res) => {
  try {
    const rawBody = req.body.toString('utf8');
    console.log('📩 Received device data from iOS');

    // Parse the plist XML data
    const deviceInfo = parseDeviceData(rawBody);

    if (!deviceInfo.UDID) {
      console.error('❌ No UDID found in device data');
      return res.status(400).send('Invalid device data');
    }

    // Sanitize data
    const sanitized = sanitizeDeviceInfo(deviceInfo);

    // Build query parameters for display page
    const queryParams = new URLSearchParams(sanitized);

    // Redirect to display page with device info
    res.redirect(301, `/display?${queryParams.toString()}`);
    console.log('✅ Device info captured, redirecting to display page');
  } catch (error) {
    console.error('Error processing device data:', error);
    res.status(500).send('Error processing device data');
  }
});

/**
 * ROUTE: GET /display - Show collected device information
 */
app.get('/display', (req, res) => {
  try {
    const { udid, imei, serial, product, version } = req.query;

    if (!udid) {
      return res.status(400).send('No device information provided');
    }

    const html = fs.readFileSync(path.join(__dirname, 'views/display.html'), 'utf8')
      .replace(/{{UDID}}/g, sanitize(udid))
      .replace(/{{IMEI}}/g, sanitize(imei) || 'N/A (Wi-Fi Model)')
      .replace(/{{SERIAL}}/g, sanitize(serial))
      .replace(/{{PRODUCT}}/g, sanitize(product))
      .replace(/{{VERSION}}/g, sanitize(version))
      .replace(/{{HAS_IMEI}}/g, imei ? 'true' : 'false')
      .replace(/{{HAS_PRODUCT}}/g, product ? 'true' : 'false');

    res.send(html);
  } catch (error) {
    console.error('Error rendering display page:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * ROUTE: GET /health - Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: {
      usingSelfSigned: config.certificate.useSelfSigned,
      baseUrl: config.server.baseUrl,
      organization: config.organization.name
    }
  });
});

/**
 * Parse device data from iOS plist XML
 */
function parseDeviceData(plistXml) {
  const deviceInfo = {};

  // Extract key-value pairs using regex
  const regex = /<key>(.*?)<\/key>\s*<string>(.*?)<\/string>/gs;
  let match;

  while ((match = regex.exec(plistXml)) !== null) {
    const key = match[1];
    const value = match[2];
    deviceInfo[key] = value;
  }

  return deviceInfo;
}

/**
 * Sanitize device information
 */
function sanitizeDeviceInfo(deviceInfo) {
  return {
    udid: sanitize(deviceInfo.UDID || ''),
    imei: sanitize(deviceInfo.IMEI || ''),
    serial: sanitize(deviceInfo.SERIAL || ''),
    product: sanitize(deviceInfo.PRODUCT || ''),
    version: sanitize(deviceInfo.VERSION || '')
  };
}

/**
 * Sanitize string to prevent XSS
 */
function sanitize(str) {
  if (!str) return '';
  return String(str)
    .replace(/[<>'"]/g, '')
    .trim();
}

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 iOS OTA Device Collector Started');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📍 Server:        http://localhost:${PORT}`);
  console.log(`🌐 Public URL:    ${config.server.baseUrl}`);
  console.log(`🏢 Organization:  ${config.organization.name}`);
  console.log(`🔐 Certificate:   ${config.certificate.useSelfSigned ? 'Self-Signed' : 'User-Provided'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Display certificate info
  const certInfo = certSigner.getCertificateInfo();
  console.log('📜 Certificate Details:');
  console.log(`   Subject:   ${certInfo.subject}`);
  console.log(`   Valid From: ${certInfo.validFrom.toLocaleDateString()}`);
  console.log(`   Valid To:   ${certInfo.validTo.toLocaleDateString()}`);
  console.log();

  if (config.server.baseUrl.startsWith('http://') && process.env.NODE_ENV === 'production') {
    console.log('⚠️  WARNING: Using HTTP in production. iOS requires HTTPS for profile installation!\n');
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Shutting down gracefully...');
  process.exit(0);
});
