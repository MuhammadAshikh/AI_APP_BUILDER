# Hamshake

A chat-first creative coding workspace built with Next.js, React, TypeScript, Cloudflare Workers AI, and Cloudflare D1. Hamshake accounts, sessions, and project history are stored in D1. AI generations produce Cloudflare-ready Next.js apps with D1 SQLite migrations. The workspace runs generated apps in isolated Cloudflare Container previews and keeps a sandboxed HTML snapshot as a fallback.

## Get started

1. Use Node.js 22.12 or newer and install dependencies with `npm install`.
2. Copy `.env.example` to the project-root `.env.local`.
3. Add your Cloudflare account ID and Workers AI API token to enable generation. For local development, put them in `.env.local`; for deployment, configure `CLOUDFLARE_ACCOUNT_ID` and the `CLOUDFLARE_API_TOKEN` secret in the Worker environment. The AI token stays on the server and needs Workers AI Read and Edit permissions. The default model is `@cf/openai/gpt-oss-120b`; set `CLOUDFLARE_AI_MODEL` to use another supported model.
4. The Worker uses the D1 database `app_builder`, configured in `wrangler.jsonc`. Apply the local schema with `npm run db:migrate:local` and the remote schema with `npm run db:migrate:remote`. The migration script reads `CLOUDFLARE_D1_API_TOKEN` from `.env.local` or the environment. The token needs Account D1 Write and Account Settings Read.
5. Run `npm run dev` and open `http://localhost:3000`.

Users can create public email/password accounts stored in D1. Passwords are hashed and sessions use HttpOnly cookies. Email verification and password recovery are not available because no email-delivery service is configured. Existing accounts and projects are not imported; the auth migration removes projects that have no matching new Cloudflare account. Users must create new accounts and projects.

Project changes are saved to D1 but are not pushed live between open tabs. Add a Cloudflare Durable Object WebSocket channel if live cross-tab updates are needed.

Generated apps are instructed to use Cloudflare D1, Wrangler bindings, SQLite migrations, and server-side database access. D1 has no built-in authentication or row-level security, so generated apps must enforce user authorization in server routes. Use the Code view to browse and copy generated files.

The full-stack preview runs each saved project in its own Cloudflare Container and Durable Object using the `standard-1` instance size. The generated Next.js app can serve its routes, APIs, and server actions. The container receives only the saved project files; it does not receive Hamshake credentials or the D1 binding. Public internet access is disabled. HTTPS downloads from `registry.npmjs.org` are allowed only while dependencies install, then blocked for the running app. Each preview sleeps after five minutes without requests, and the Worker caps active previews at 20. Container CPU, provisioned memory, disk, Worker, and Durable Object usage are billed by Cloudflare; review the current [Containers pricing](https://developers.cloudflare.com/containers/platform/pricing/) before enabling previews for users. If the Container preview is unavailable, the workspace shows the standalone HTML snapshot instead.

## Deploy to Cloudflare Workers

The Cloudflare Workers are named `app-builder` and `app-builder-preview`. In Cloudflare Workers Builds, use `/` as the root directory, `npm run build:cloudflare` as the build command, and `npm run deploy:cloudflare` as the deploy command. The deploy script publishes the Container preview Worker first, then the OpenNext app Worker. Use a Workers Paid plan and enable Docker-compatible image builds in Workers Builds. A first Container deployment may take several minutes.

Before deploying:

1. In the Cloudflare DNS zone for `hamshake.com`, ensure a proxied wildcard DNS record exists for `*.hamshake.com` (a proxied placeholder A record such as `192.0.2.1` is sufficient for a Worker route). Existing explicit DNS records take precedence. The route in `wrangler.preview.jsonc` is `*.hamshake.com/*`; the Worker only serves project hosts in the form `p-<project-uuid>.hamshake.com`. Exact routes such as `www.hamshake.com` are more specific and continue to use their existing Worker. Check for any existing wildcard Worker route first, because it may conflict with the preview route.
2. Apply the new D1 token-table migration with `npm run db:migrate:remote` before deploying. It creates short-lived, project-scoped preview tokens; only a hash is stored in D1.
3. Configure the `app-builder-preview` Worker route and verify that the zone has an active certificate covering `*.hamshake.com`. Wrangler deploy needs permission to publish both Workers, manage Containers, configure the route, and access the D1 database.

The self-reference service binding in `wrangler.jsonc` must target the same Worker name. Keep `name` and `services[0].service` in sync if you rename the main Worker. Run `npm run dev` for local development; it continues to show the HTML snapshot because the Cloudflare Container preview runs in the deployed Worker environment.
