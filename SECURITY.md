# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | ✅        |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in this project, please report it responsibly.

**Please do NOT open a public issue for security vulnerabilities.**

Instead, email us directly at: **security@example.com**

### What to include in your report:

- Description of the vulnerability
- Steps to reproduce
- Affected versions
- Any potential impact
- Suggested fix (if you have one)

### What happens next:

1. We will acknowledge your report within **48 hours**
2. We will investigate and provide a status update within **5 business days**
3. We will work on a fix and release it as soon as possible
4. We will credit you for the discovery (unless you prefer to remain anonymous)

## Security Best Practices for Contributors

- Never commit secrets, API keys, or credentials to the repository
- Use environment variables for sensitive configuration
- Keep dependencies up to date
- Run `pnpm audit` regularly to check for known vulnerabilities
- Follow the principle of least privilege when granting access

## Dependency Security

We use automated tools to monitor dependencies:

- **Dependabot** — automated dependency updates and security alerts
- **pnpm audit** — checks for known vulnerabilities in the dependency tree

If you find a vulnerable dependency, please report it using the process above.