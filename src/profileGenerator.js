const { v4: uuidv4 } = require('uuid');
const plist = require('plist');

/**
 * Generate iOS configuration profile (.mobileconfig)
 */
class ProfileGenerator {
  constructor(config) {
    this.config = config;
  }

  /**
   * Generate the configuration profile XML
   * @returns {string} - XML content for .mobileconfig file
   */
  generateProfile() {
    const captureUrl = `${this.config.server.baseUrl}/capture`;

    const profile = {
      PayloadContent: {
        URL: captureUrl,
        DeviceAttributes: this.config.deviceAttributes
      },
      PayloadOrganization: this.config.organization.name || 'Device Collector',
      PayloadDisplayName: this.config.organization.displayName || 'Device Registration',
      PayloadIdentifier: this.config.organization.identifier || 'com.devicecollector.profile',
      PayloadDescription: this.config.organization.description || 'Device Registration Profile',
      PayloadType: 'Profile Service',
      PayloadUUID: uuidv4(),
      PayloadVersion: 1
    };

    // Convert to plist XML format
    const xml = plist.build(profile);
    return xml;
  }

  /**
   * Get filename for the profile
   */
  getFilename() {
    const orgName = this.config.organization.name || 'Device';
    const sanitized = orgName.replace(/[^a-zA-Z0-9]/g, '-');
    return `${sanitized}-Profile.mobileconfig`;
  }
}

module.exports = ProfileGenerator;
