# Contributing to iOS OTA Device Collector

First off, thank you for considering contributing to iOS OTA Device Collector! It's people like you that make this tool better for everyone.

## Code of Conduct

This project adheres to a code of mutual respect. Please be kind and courteous to other contributors.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title** - Describe the issue concisely
- **Steps to reproduce** - Detailed steps to reproduce the behavior
- **Expected behavior** - What you expected to happen
- **Actual behavior** - What actually happened
- **Environment**:
  - OS: [e.g., macOS, Ubuntu]
  - Node.js version: [e.g., 18.17.0]
  - Docker version (if applicable): [e.g., 24.0.5]
  - iOS version (if applicable): [e.g., iOS 17.2]
- **Logs** - Include relevant error messages or logs
- **Screenshots** - If applicable

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear title** - Use a descriptive title
- **Detailed description** - Explain the feature and why it would be useful
- **Use cases** - Provide real-world examples
- **Alternatives considered** - Mention other solutions you've thought about

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following the code style below
3. **Test your changes** thoroughly
4. **Update documentation** if needed (README, CLAUDE.md)
5. **Commit with clear messages** describing what and why
6. **Submit the pull request** with a clear description

#### Pull Request Process

1. Ensure your code follows the existing style
2. Update the README.md with details of changes if applicable
3. Test with both self-signed and Apple Developer certificates
4. Test on an actual iOS device if possible
5. The PR will be merged once reviewed and approved

## Development Setup

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (for container testing)
- iOS device (for full testing)

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/ios-ota-device-collector.git
cd ios-ota-device-collector

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your BASE_URL
# For local testing, you can use ngrok:
# npx ngrok http 3000
# Then set BASE_URL to the ngrok HTTPS URL

# Start development server
npm run dev
```

### Testing

Before submitting a PR, test the following:

1. **Basic Flow**
   - Landing page loads
   - QR code displays
   - Profile downloads
   - Profile installs on iOS
   - Device info displays correctly

2. **Certificate Types**
   - Test with self-signed certificate
   - Test with Apple Developer certificate (if available)

3. **Docker**
   ```bash
   docker-compose build
   docker-compose up
   # Test that it works
   ```

4. **Security**
   - Test rate limiting (make 11+ requests quickly)
   - Test XSS prevention (try injecting `<script>` in device data)

## Code Style

### JavaScript

- Use modern ES6+ syntax
- Prefer `async/await` over callbacks
- Use meaningful variable names
- Add comments for complex logic
- No semicolons (consistent with existing code)

**Example**:
```javascript
// Good
async function loadCertificate(path) {
  try {
    const data = await fs.readFile(path)
    return parseCertificate(data)
  } catch (error) {
    console.error('Failed to load certificate:', error)
    throw error
  }
}

// Avoid
function loadCert(p, cb) {
  fs.readFile(p, function(err, data) {
    if (err) return cb(err);
    cb(null, parseCert(data));
  });
}
```

### HTML/CSS

- Use semantic HTML
- Mobile-first responsive design
- Consistent indentation (2 spaces)
- Comment complex CSS

### Configuration

- YAML for application config
- Environment variables for deployment config
- Document all new config options

## Project Structure

```
src/
├── server.js           # Main Express app - keep routes here
├── config.js           # Config loader - don't add business logic
├── profileGenerator.js # Profile generation only
├── certSigner.js       # Certificate operations only
└── views/              # HTML templates

config/
├── config.yml          # Application settings
└── certs/              # Certificates directory
```

**Principles**:
- Keep files focused on single responsibility
- Avoid circular dependencies
- Keep it simple - don't over-engineer

## Commit Messages

Use clear, descriptive commit messages:

**Good**:
```
Add support for custom branding colors
Fix certificate validation error on startup
Update README with ngrok instructions
```

**Avoid**:
```
Update
Fix bug
WIP
```

### Commit Message Format

```
<type>: <subject>

<body (optional)>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

## What We're Looking For

### Priority Contributions

- Bug fixes
- Documentation improvements
- Performance optimizations
- Security enhancements
- iOS compatibility fixes

### Nice to Have

- Additional certificate formats support
- UI/UX improvements
- Internationalization (i18n)
- Additional deployment guides

### Not Looking For

- Database integration (goes against privacy-first design)
- Complex admin panels (keeps it simple)
- Authentication systems (out of scope)
- Major architectural changes (discuss first in an issue)

## Questions?

- Open an issue for questions
- Check CLAUDE.md for architecture details
- Review existing code for patterns

## Recognition

Contributors will be recognized in:
- GitHub contributors list
- Release notes (for significant contributions)
- README acknowledgments (for major features)

Thank you for contributing! 🎉
