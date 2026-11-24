# Hamshake

A chat-first creative coding workspace built with Next.js, React, TypeScript, Cloudflare Workers AI, and Cloudflare D1. Hamshake accounts, sessions, and project history are stored in D1. AI generations produce Cloudflare-ready Next.js apps with D1 SQLite migrations. The workspace includes a sandboxed HTML snapshot preview and a multi-file source browser.

## Get started

1. Use Node.js 22.12 or newer and install dependencies with `npm install`.
2. Copy `.env.example` to the project-root `.env.local`.
3. Add your Cloudflare account ID and Workers AI API token to enable generation. For local development, put them in `.env.local`; for deployment, configure `CLOUDFLARE_ACCOUNT_ID` and the `CLOUDFLARE_API_TOKEN` secret in the Worker environment. The AI token stays on the server and needs Workers AI Read and Edit permissions. The default model is `@cf/openai/gpt-oss-120b`; set `CLOUDFLARE_AI_MODEL` to use another supported model.
4. The Worker uses the D1 database `app_builder`, configured in `wrangler.jsonc`. Apply the local schema with `npm run db:migrate:local` and the remote schema with `npm run db:migrate:remote`. The migration script reads `CLOUDFLARE_D1_API_TOKEN` from `.env.local` or the environment. The token needs Account D1 Write and Account Settings Read.
5. Run `npm run dev` and open `http://localhost:3000`.

Users can create public email/password accounts stored in D1. Passwords are hashed and sessions use HttpOnly cookies. Email verification and password recovery are not available because no email-delivery service is configured. Existing accounts and projects are not imported; the auth migration removes projects that have no matching new Cloudflare account. Users must create new accounts and projects.

Project changes are saved to D1 but are not pushed live between open tabs. Add a Cloudflare Durable Object WebSocket channel if live cross-tab updates are needed.

Generated apps are instructed to use Cloudflare D1, Wrangler bindings, SQLite migrations, and server-side database access. D1 has no built-in authentication or row-level security, so generated apps must enforce user authorization in server routes. Use the Code view to browse and copy generated files.

The preview displays the generated standalone HTML snapshot in a sandboxed iframe and uses no external preview service. It can demonstrate client-side interactions included in that HTML, but does not execute the generated Next.js source, API routes, server actions, or server-side authentication. Run or deploy the generated project separately to test those features.

## Deploy to Cloudflare Workers

The Cloudflare Worker is named `app-builder`. In the Cloudflare Git deployment settings, use `/` as the root directory, `npm run build:cloudflare` as the build command, and `npx wrangler deploy` as the deploy command. The OpenNext build command creates the Worker output that Wrangler deploys; `npm run build` alone only builds the standard Next.js app.

The self-reference service binding in `wrangler.jsonc` must target the same Worker name. Keep `name` and `services[0].service` in sync if you rename the Worker. Apply D1 migrations before deploying schema changes.
