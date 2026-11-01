# Security policy

## Supported versions

| Version | Supported |
|---|---|
| `main` | Yes: security fixes land here first |
| `v0.x` pre-releases | Only the latest pre-release |
| `v1.x` (from February 2027) | The latest minor release |

## Reporting a vulnerability

Please don't open a public issue, discussion or pull request for a security problem. Report it
privately:

1. **GitHub (preferred):** the
   [Security tab](https://github.com/ahmershahdev/offlineshelf/security/advisories/new) of this
   repository, **Report a vulnerability**.
2. **Email:** [support@ahmershah.dev](mailto:support@ahmershah.dev) with "Security" in the subject.

Include the affected endpoint or file, steps to reproduce, the version or commit, and what an
attacker could do with it. A proof of concept against your own install is welcome; please don't
test against the public instance in ways that affect other users or Wikimedia.

## What happens next

| Step | Within |
|---|---|
| First answer | 7 days |
| Assessment and severity | 14 days |
| Fix for high and critical issues | 30 days, sooner when possible |
| Public advisory and credit (if you want it) | When the fix is released |

## Scope

In scope: the API (`/api/v1`), the web app, the build and export jobs, the Docker Compose setup and
the code in this repository.

Out of scope: content on Wikipedia and other Wikimedia sites, denial of service by sheer volume,
missing headers on pages without sensitive data, and issues that need a compromised device or
admin access to the server.

## What is in place

Argon2id passwords, per-session CSRF tokens with same-origin checks, `HttpOnly` `SameSite` cookies
(`Secure` and `__Host-` in production), a per-request CSP nonce, rate limits in nginx and the API,
a Wikimedia hostname allow list, owner checks on every query, non-root read-only containers, and
CodeQL, Dependabot and secret scanning on the repository. Details:
[offlineshelf.ahmershah.dev/security](https://offlineshelf.ahmershah.dev/security) and
[docs/architecture.md](docs/architecture.md#security).

`/.well-known/security.txt` (RFC 9116) on every install points here.
