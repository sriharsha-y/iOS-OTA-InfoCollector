const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

const SELF_SIGNED_CERT_PATH = path.join(__dirname, '../config/certs/self-signed.pem');
const SELF_SIGNED_KEY_PATH = path.join(__dirname, '../config/certs/self-signed-key.pem');

/**
 * Certificate signing utilities
 * Supports both self-signed certificates and Apple Developer certificates
 */
class CertificateSigner {
  constructor(config) {
    this.config = config;
    this.cert = null;
    this.privateKey = null;
    this.initialize();
  }

  /**
   * Initialize certificate based on configuration
   */
  initialize() {
    if (this.config.certificate.useSelfSigned) {
      this.loadOrCreateSelfSigned();
    } else {
      this.loadUserCertificate();
    }
  }

  /**
   * Load or create a self-signed certificate
   */
  loadOrCreateSelfSigned() {
    try {
      // Try to load existing self-signed cert
      if (fs.existsSync(SELF_SIGNED_CERT_PATH) && fs.existsSync(SELF_SIGNED_KEY_PATH)) {
        console.log('📜 Loading existing self-signed certificate...');
        const certPem = fs.readFileSync(SELF_SIGNED_CERT_PATH, 'utf8');
        const keyPem = fs.readFileSync(SELF_SIGNED_KEY_PATH, 'utf8');

        this.cert = forge.pki.certificateFromPem(certPem);
        this.privateKey = forge.pki.privateKeyFromPem(keyPem);
        console.log('✅ Self-signed certificate loaded successfully');
      } else {
        // Create new self-signed certificate
        console.log('🔑 Generating new self-signed certificate...');
        this.createSelfSignedCertificate();
        console.log('✅ Self-signed certificate created and saved');
      }
    } catch (error) {
      console.error('Error with self-signed certificate:', error.message);
      console.log('🔄 Regenerating self-signed certificate...');
      this.createSelfSignedCertificate();
    }
  }

  /**
   * Create a new self-signed certificate
   */
  createSelfSignedCertificate() {
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();

    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10); // Valid for 10 years

    const orgName = this.config.organization.name || 'Device Collector';
    const attrs = [{
      name: 'commonName',
      value: orgName
    }, {
      name: 'organizationName',
      value: orgName
    }, {
      shortName: 'OU',
      value: 'Device Management'
    }];

    cert.setSubject(attrs);
    cert.setIssuer(attrs);

    // Self-sign the certificate
    cert.sign(keys.privateKey, forge.md.sha256.create());

    // Save to files
    const certPem = forge.pki.certificateToPem(cert);
    const keyPem = forge.pki.privateKeyToPem(keys.privateKey);

    fs.writeFileSync(SELF_SIGNED_CERT_PATH, certPem);
    fs.writeFileSync(SELF_SIGNED_KEY_PATH, keyPem);

    this.cert = cert;
    this.privateKey = keys.privateKey;
  }

  /**
   * Load user-provided Apple Developer certificate
   */
  loadUserCertificate() {
    const certPath = path.resolve(this.config.certificate.userCertPath);
    const password = this.config.certificate.userCertPassword || '';

    try {
      console.log('📜 Loading user-provided certificate from:', certPath);

      if (!fs.existsSync(certPath)) {
        throw new Error(`Certificate file not found: ${certPath}`);
      }

      const p12Data = fs.readFileSync(certPath);
      const p12Der = forge.util.decode64(p12Data.toString('base64'));
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

      // Extract certificate and private key
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

      if (!certBags[forge.pki.oids.certBag] || certBags[forge.pki.oids.certBag].length === 0) {
        throw new Error('No certificate found in .p12 file');
      }

      if (!keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] || keyBags[forge.pki.oids.pkcs8ShroudedKeyBag].length === 0) {
        throw new Error('No private key found in .p12 file');
      }

      this.cert = certBags[forge.pki.oids.certBag][0].cert;
      this.privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;

      console.log('✅ User certificate loaded successfully');
    } catch (error) {
      console.error('❌ Error loading user certificate:', error.message);
      console.log('💡 Falling back to self-signed certificate...');
      this.config.certificate.useSelfSigned = true;
      this.loadOrCreateSelfSigned();
    }
  }

  /**
   * Sign a mobile configuration profile
   * @param {string} profileXml - The XML content of the .mobileconfig
   * @returns {Buffer} - Signed PKCS#7 data
   */
  signProfile(profileXml) {
    try {
      // Create PKCS#7 signed data
      const p7 = forge.pkcs7.createSignedData();
      p7.content = forge.util.createBuffer(profileXml, 'utf8');

      p7.addCertificate(this.cert);
      p7.addSigner({
        key: this.privateKey,
        certificate: this.cert,
        digestAlgorithm: forge.pki.oids.sha256,
        authenticatedAttributes: [{
          type: forge.pki.oids.contentType,
          value: forge.pki.oids.data
        }, {
          type: forge.pki.oids.messageDigest
        }, {
          type: forge.pki.oids.signingTime,
          value: new Date()
        }]
      });

      p7.sign();

      const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
      return Buffer.from(der, 'binary');
    } catch (error) {
      console.error('Error signing profile:', error.message);
      throw new Error('Failed to sign configuration profile');
    }
  }

  /**
   * Get certificate info for display
   */
  getCertificateInfo() {
    return {
      subject: this.cert.subject.attributes.map(attr => `${attr.name}=${attr.value}`).join(', '),
      issuer: this.cert.issuer.attributes.map(attr => `${attr.name}=${attr.value}`).join(', '),
      validFrom: this.cert.validity.notBefore,
      validTo: this.cert.validity.notAfter,
      isSelfSigned: this.config.certificate.useSelfSigned
    };
  }
}

module.exports = CertificateSigner;
