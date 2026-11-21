# Morrow

A chat-first creative coding workspace built with Next.js, React, TypeScript, and Supabase Auth. AI generations produce a runnable Next.js App Router project with React/TypeScript, semantic HTML5, Tailwind CSS v4 and CSS3, and a Supabase SQL schema. The workspace includes project history, a responsive HTML preview, and a multi-file source browser.

## Get started

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Add your Supabase project URL and anon key to enable sign-in and sign-up. Run `supabase/schema.sql` in the Supabase SQL Editor to create the user-owned projects table and row-level security policies.
4. Add your Cloudflare account ID and a Workers AI API token to enable AI chat. The token stays on the server and is never exposed to the browser. A custom token needs Workers AI Read and Edit permissions. The default model is `@cf/meta/llama-3.3-70b-instruct-fp8-fast`; set `CLOUDFLARE_AI_MODEL` to use another supported model.
5. Run `npm run dev` and open `http://localhost:3000`.

The landing page preview can be explored without configuring credentials, but users must sign in to create or edit projects. Project history and edits are stored in Supabase, automatically saved as changes are made, and synchronized through Supabase Realtime. Run the updated `supabase/schema.sql` in the Supabase SQL Editor to enable the projects table, row-level security, and realtime publication. Projects are not stored in browser local storage.

Generated projects include `package.json`, `tsconfig.json`, `next.config.ts`, `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `postcss.config.mjs`, and `supabase/schema.sql`. Use the Code view to browse and copy generated files. Database tables and row-level security policies are added to the SQL file when an app needs persistent data.

## Deploy to Cloudflare Workers

The Cloudflare Worker is named `ai-app-builder`. In the Cloudflare Git deployment settings, use `/` as the root directory, `npm run build:cloudflare` as the build command, and `npx wrangler deploy` as the deploy command. The OpenNext build command creates the Worker output that Wrangler deploys; `npm run build` alone only builds the standard Next.js app.

The self-reference service binding in `wrangler.jsonc` must target the same Worker name. Keep `name` and `services[0].service` in sync if you rename the Worker.
