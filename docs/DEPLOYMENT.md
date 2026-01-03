# Deployment Guide

This project uses GitHub Actions to automatically deploy to Cloudflare Pages on every push to the `main` branch.

## Prerequisites

- GitHub repository connected to the project
- Cloudflare account with Workers/Pages access
- Convex project setup

## Required GitHub Secrets

You need to configure the following secrets in your GitHub repository settings:

### Secrets (Settings → Secrets and variables → Actions → Secrets)

1. **CLOUDFLARE_WORKERS_TOKEN**
   - Go to Cloudflare Dashboard → My Profile → API Tokens
   - Create a new token with "Edit Cloudflare Workers" permissions
   - Add this token as a secret

2. **FONTAWESOME_TOKEN** (if using Font Awesome Pro)
   - Your Font Awesome Pro npm token
   - Get it from Font Awesome account settings
   - Skip this if not using Font Awesome Pro

### Variables (Settings → Secrets and variables → Actions → Variables)

1. **VITE_CONVEX_URL**
   - Your Convex deployment URL
   - Format: `https://your-project.convex.cloud`
   - Get it from your Convex dashboard

## Deployment Configuration

The deployment workflow:

1. **Triggers**: Automatically on push to `main` branch
2. **Build Tool**: Bun (faster than npm/yarn)
3. **Hosting**: Cloudflare Pages via Workers
4. **Domain Pattern**: `{repo-name}.projects.techlibs.io`

## Manual Deployment

If you need to deploy manually:

```bash
# Install dependencies
bun install

# Build the project
bunx --bun vite build

# Deploy to Cloudflare (requires wrangler.toml)
bunx wrangler deploy
```

## Cloudflare Configuration

The Cloudflare Account ID is hardcoded in the workflow:
- **Account ID**: `dab2bafab52ddc7ae16e56224b224959`

The deployment automatically creates:
- `worker.js`: Simple asset fetcher
- `wrangler.toml`: Cloudflare Workers configuration
- Route pattern based on repository name

## Domain Setup

After first deployment, the project will be available at:
```
https://{repository-name}.projects.techlibs.io
```

Make sure the DNS is configured in Cloudflare for `techlibs.io` zone.

## Troubleshooting

### Deployment fails with "Invalid API Token"
- Verify `CLOUDFLARE_WORKERS_TOKEN` is set correctly
- Check the token has proper permissions

### Build fails with missing environment variables
- Ensure `VITE_CONVEX_URL` is set in repository variables
- Check variable name matches exactly (case-sensitive)

### 404 errors after deployment
- Verify `not_found_handling = "single-page-application"` is in wrangler.toml
- Check that routes are properly configured

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Bun Documentation](https://bun.sh/docs)
- [Convex Documentation](https://docs.convex.dev/)
