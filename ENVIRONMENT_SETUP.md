# Environment Setup Guide

This guide will help you set up the Maki development environment and troubleshoot common issues.

## Quick Start

1. **Create a `.env` file** in the root of the project with the required environment variables (see the [documentation](https://kaneo.app/docs/core/installation/environment-variables) for the complete list).

2. **Start the development servers**:
   ```bash
   pnpm dev
   ```

This starts both the API (port 1337) and web app (port 5173). Both will automatically reload when you make changes.

> **Tip**: The web app at http://localhost:5173 will automatically connect to the API at http://localhost:1337

## Environment Variables

Maki uses a **single `.env` file** in the root of the project for all environment variables. This file is shared by both the API and web services.

### Required Variables

For development, you'll need at minimum:

- `MAKI_CLIENT_URL` - The URL of the web application (e.g., `http://localhost:5173`)
- `MAKI_API_URL` - The URL of the API (e.g., `http://localhost:1337`)
- `AUTH_SECRET` - Secret key for JWT token generation (**must be at least 32 characters long**; use a long, random value in production)
- `DEVICE_AUTH_CLIENT_IDS` - **Optional.** Comma-separated list of allowed device-flow OAuth client IDs. When unset, Maki implicitly allows `maki-cli` and `maki-mcp` by default (no extra configuration for the CLI or MCP). Override only when you need additional trusted clients, for example `maki-cli,maki-mcp,my-desktop-app`.
- `DATABASE_URL` - PostgreSQL connection string
- `POSTGRES_DB` - PostgreSQL database name
- `POSTGRES_USER` - PostgreSQL username
- `POSTGRES_PASSWORD` - PostgreSQL password

If your app uses a device client ID that is not included in the defaults, set `DEVICE_AUTH_CLIENT_IDS` to the full comma-separated list of allowed IDs (including any defaults you still need), so it includes the client ID your app sends to `/api/auth/device/code`.

### Development-Specific Variables

For local development, the web app also supports:
- `VITE_API_URL` - API URL for development (defaults to `http://localhost:1337` if not set)
- `VITE_APP_URL` - App URL for generating links (optional)
- `MAKI_SITE_URL` - Optional canonical origin for the public marketing site and its metadata (defaults to `http://localhost:3001`).
- `NEXT_PUBLIC_MAKI_APP_URL` - Optional product-app URL used by the public `apps/site` sign-in and sign-up links. It defaults to `MAKI_CLIENT_URL`, then to `http://localhost:5173` for an unconfigured local checkout.

### Optional Variables

Maki supports many optional configuration options including:
- `MAKI_INTERNAL_API_URL` - API origin used only for server-side requests from the built-in HTTP MCP endpoint. Defaults to `http://127.0.0.1:1337`; override it only if the API is not reachable there from its own process.
- GitHub repository integration (GitHub App: `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`, optional `GITHUB_APP_NAME`)
- Resend configuration for email (invitations, password resets, notifications, due-date reminders)
- ImageKit configuration for file uploads (task descriptions and comments)
- Access control settings
- CORS configuration
- Redis for horizontal scaling
- Private-network notification receivers (`MAKI_ALLOW_PRIVATE_WEBHOOK_DESTINATIONS=true` lets ntfy/Gotify/webhook destinations resolve to private addresses; off by default to prevent SSRF)

#### Redis Configuration

Maki supports three Redis deployment modes for WebSocket Pub/Sub. When any Redis mode is configured, WebSocket broadcasts use Redis Pub/Sub, allowing multiple API instances to relay real-time updates. When none are set, an in-memory adapter is used (single-instance only).

**Standalone (single server):**
- `REDIS_URL` - Redis connection string (e.g., `redis://localhost:6379`)

**Sentinel (high-availability with automatic failover):**
- `REDIS_SENTINELS` - Comma-separated list of Sentinel nodes (e.g., `sentinel-1:26379,sentinel-2:26379,sentinel-3:26379`)
- `REDIS_SENTINEL_MASTER_NAME` - Name of the Sentinel master group (default: `mymaster`)
- `REDIS_SENTINEL_PASSWORD` - Password for Sentinel instances, if different from the Redis password (optional)
- `REDIS_SENTINEL_TLS` - Set to `true` to enable TLS for Sentinel connections (default: `false`)

**Cluster (horizontal sharding):**
- `REDIS_CLUSTER_NODES` - Comma-separated list of cluster seed nodes (e.g., `node-1:6379,node-2:6379,node-3:6379`)

**Shared (used by Sentinel and Cluster modes):**
- `REDIS_PASSWORD` - Password for the Redis data nodes (used by both Sentinel and Cluster modes, not for Sentinel auth itself; use `REDIS_SENTINEL_PASSWORD` for that)

> **Note:** Only one mode should be configured at a time. If multiple are set, the priority is: Cluster > Sentinel > Standalone.

#### Resend Configuration

For sending emails (password resets, workspace invitations, notifications, due-date reminders), configure these variables:
- `RESEND_API_KEY` - Resend API key (required to send email; get one at https://resend.com/api-keys)
- `RESEND_FROM` - Sender address, e.g. `Maki <no-reply@maki.app>`. Must use a domain verified in your Resend account. Defaults to Resend's sandbox sender `Maki <onboarding@resend.dev>`, which only delivers to your account email.

> **Note:** While in Resend's sandbox (no verified domain), sent emails include a sandbox header and only reach the account owner's inbox. Verify a domain in Resend to send to real recipients.

Resend is optional. Sign-in is always email + password; without a `RESEND_API_KEY`, invitation links are delivered by the copy-link fallback in the invite dialog, email-based notifications are skipped, and password-reset email is unavailable.

#### ImageKit Configuration

For file uploads in task descriptions and comments, configure these variables:
- `IMAGEKIT_PUBLIC_KEY` - ImageKit public key, used by the browser to upload files directly (required)
- `IMAGEKIT_PRIVATE_KEY` - ImageKit private key, used server-side to sign uploads and reads; never expose it to the browser (required)
- `IMAGEKIT_URL_ENDPOINT` - Your ImageKit delivery endpoint, e.g. `https://ik.imagekit.io/your-media-library-id` (required)
- `IMAGEKIT_MAX_UPLOAD_BYTES` - Maximum upload size in bytes (default: 10 MB)
- `IMAGEKIT_UPLOAD_TTL_SECONDS` - Upload token lifetime in seconds (default: 300)

Get the keys from the [ImageKit dashboard](https://dashboard.imagekit.io) under **Developer options → API keys**. Uploads are optional; without the three required variables, the attach buttons in the editors return 503 and uploads are unavailable.

#### Cloud-mode abuse mitigations

Hosted multi-tenant instances should enable the cloud abuse gates. Self-hosted instances can leave these unset.

- `MAKI_CLOUD` - Set to `true` to enable cloud-only protections: disposable-email signup block, Turnstile captcha enforcement, and tightened rate limits on `/sign-up/email` and `/organization/invite-member`.
- `TURNSTILE_SECRET_KEY` - Cloudflare Turnstile secret key (API container, server-side verification). When unset, captcha verification is skipped.
- `MAKI_TURNSTILE_SITE_KEY` - Cloudflare Turnstile site key, on the **web container**. The production web image bakes the literal placeholder `MAKI_TURNSTILE_SITE_KEY` into the bundle; `apps/web/env.sh` swaps it for the runtime value when the container starts.
- `VITE_TURNSTILE_SITE_KEY` - Local dev only. Set in `apps/web/.env` when running `pnpm dev`; Vite reads this at build/dev time. Not used in the production image.

#### Sentry (error monitoring)

All Sentry integration is opt-in; leave these unset for zero telemetry.

- `SENTRY_DSN` - Sentry DSN for the API. When unset, the Sentry SDK never initializes.
- `SENTRY_ENVIRONMENT` - Environment tag for API events (defaults to `NODE_ENV`).
- `SENTRY_TRACES_SAMPLE_RATE` - Fraction of API requests to trace for performance monitoring, `0`-`1` (default: `0`, tracing off).
- `MAKI_SENTRY_DSN` - Sentry DSN for the **web container** (browser errors, tracing, session replay). Same runtime-placeholder mechanism as `MAKI_TURNSTILE_SITE_KEY`.
- `VITE_SENTRY_DSN` - Local dev only. Set in `apps/web/.env` when running `pnpm dev`.

For a complete list of all environment variables, their descriptions, and configuration options, see the [official documentation](https://kaneo.app/docs/core/installation/environment-variables).

## Common Issues & Troubleshooting

### CORS Errors

**Symptoms:**
- "Failed to fetch" errors in browser console
- Network errors when making API requests
- "Access to fetch at '...' from origin '...' has been blocked by CORS policy"

**Solutions:**

1. **Check URL Configuration:**
   - Ensure `MAKI_API_URL` matches your API server URL
   - Ensure `MAKI_CLIENT_URL` matches your web app URL
   - For development, you can also set `VITE_API_URL` in your `.env` file

2. **Configure CORS Origins:**
   - Add your frontend URL to `CORS_ORIGINS` in your `.env`:
     ```
     CORS_ORIGINS=http://localhost:5173,https://yourdomain.com
     ```
   - For development, you can leave `CORS_ORIGINS` empty to allow all origins
   - **Note:** `CORS_ORIGINS` should match `MAKI_CLIENT_URL` for proper authentication

3. **Check Protocol Consistency:**
   - Ensure both frontend and API use the same protocol (http/https)
   - Don't mix http and https in development

4. **Verify Server Accessibility:**
   - Test if the API is accessible: `curl http://localhost:1337/config`
   - Check if the server is running on the correct port

### Database Connection Issues

**Symptoms:**
- "Database connection failed" errors
- API server won't start

**Solutions:**

1. **Check PostgreSQL:**
   - Ensure PostgreSQL is running
   - Verify database exists and credentials are correct
   - Test connection: `psql $DATABASE_URL`

2. **Update DATABASE_URL:**
   - Ensure the connection string format is correct
   - Check username, password, host, port, and database name

3. **Match the hostname to where the API runs:**
   - Use `postgres` only when the API container is on the same Docker Compose network as the Postgres service
   - Use `localhost` when the API runs directly on your host machine
   - If you see `getaddrinfo EAI_AGAIN postgres`, the API is trying to resolve the Compose hostname from the wrong network context

4. **Use the right configuration mode:**
   - For host-native development, prefer an explicit `DATABASE_URL`
   - If you derive from `POSTGRES_*`, set `POSTGRES_HOST=localhost` when running the API on your host
   - `POSTGRES_DB` and `POSTGRES_USER` by themselves do not switch Maki into derived connection mode

### Authentication Issues

**Symptoms:**
- "Authentication failed" errors
- Users can't sign in

**Solutions:**

1. **Check Authentication Configuration:**
   - Ensure `AUTH_SECRET` is set in your `.env` file
   - Use a strong secret in production
   - Verify `MAKI_CLIENT_URL` and `MAKI_API_URL` are correctly configured

2. **Clear Browser Data:**
   - Clear cookies and local storage
   - Try in incognito/private mode

### Network Errors

**Symptoms:**
- "Network error" messages
- API requests timeout

**Solutions:**

1. **Check Server Status:**
   - Verify API server is running
   - Check server logs for errors

2. **Check Firewall/Proxy:**
   - Ensure ports are not blocked
   - Check if proxy settings interfere

3. **Verify URLs:**
   - Check that all URLs are accessible
   - Test with curl or browser

## Development vs Production

### Development
- Use `http://localhost` for both frontend and API
- Leave `CORS_ORIGINS` empty to allow all origins (or set it to match your local URLs)
- Use simple secrets for `AUTH_SECRET` (not for production)
- The web app will use `VITE_API_URL` if set, otherwise defaults to `http://localhost:1337`

### Production
- Use HTTPS for both frontend and API
- Set specific `CORS_ORIGINS` for security (should match `MAKI_CLIENT_URL`)
- Use strong, unique secrets for `AUTH_SECRET`
- Configure proper database credentials
- Ensure `MAKI_CLIENT_URL` and `MAKI_API_URL` are set to your production URLs

## Getting Help

If you're still experiencing issues:

1. Check the browser console for detailed error messages
2. Review the API server logs
3. Verify all environment variables are set correctly
4. Ensure all services (PostgreSQL, API, Frontend) are running
5. Consult the [official documentation](https://kaneo.app/docs) for detailed guides and troubleshooting

For the most up-to-date information on environment variables and configuration, always refer to the [official documentation](https://kaneo.app/docs/core/installation/environment-variables).
