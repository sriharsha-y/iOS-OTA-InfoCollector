const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
require('dotenv').config();

/**
 * Load and validate configuration from YAML file and environment variables
 */
class Config {
  constructor() {
    this.loadConfig();
    this.validate();
  }

  loadConfig() {
    const configPath = process.env.CONFIG_PATH || path.join(__dirname, '../config/config.yml');

    try {
      const fileContents = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(fileContents);

      // Merge with environment variables (env vars take precedence)
      this.server = {
        port: parseInt(process.env.PORT) || config.server?.port || 3000,
        baseUrl: process.env.BASE_URL || 'http://localhost:3000'
      };

      this.organization = config.organization || {};
      this.certificate = config.certificate || {};
      this.deviceAttributes = config.deviceAttributes || ['UDID', 'IMEI', 'SERIAL', 'PRODUCT', 'VERSION'];
      this.branding = config.branding || {};
      this.security = config.security || {};

    } catch (error) {
      console.error('Error loading config file:', error.message);
      throw new Error('Failed to load configuration. Ensure config/config.yml exists.');
    }
  }

  validate() {
    // Validate required fields
    if (!this.server.baseUrl) {
      throw new Error('BASE_URL is required. Set it in .env file.');
    }

    if (!this.organization.name) {
      console.warn('Warning: organization.name not set in config.yml');
    }

    if (!this.organization.identifier) {
      console.warn('Warning: organization.identifier not set in config.yml');
    }

    // Ensure BASE_URL doesn't have trailing slash
    this.server.baseUrl = this.server.baseUrl.replace(/\/$/, '');

    // Warn if not using HTTPS in production
    if (process.env.NODE_ENV === 'production' && !this.server.baseUrl.startsWith('https://')) {
      console.warn('⚠️  WARNING: BASE_URL should use HTTPS in production for iOS profile installation to work properly!');
    }
  }

  get() {
    return {
      server: this.server,
      organization: this.organization,
      certificate: this.certificate,
      deviceAttributes: this.deviceAttributes,
      branding: this.branding,
      security: this.security
    };
  }
}

// Export singleton instance
module.exports = new Config().get();
