# Morrow

A chat-first creative coding workspace built with Next.js, React, TypeScript, and Supabase Auth. AI generations produce a runnable Next.js App Router project with React/TypeScript, semantic HTML5, Tailwind CSS v4 and CSS3, and a Supabase SQL schema. The workspace includes project history, a responsive HTML preview, and a multi-file source browser.

## Get started

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Add your Supabase project URL and anon key to enable sign-in and sign-up.
4. Add your Cloudflare account ID and a Workers AI API token to enable AI chat. The token stays on the server and is never exposed to the browser. A custom token needs Workers AI Read and Edit permissions. The default model is `@cf/meta/llama-3.3-70b-instruct-fp8-fast`; set `CLOUDFLARE_AI_MODEL` to use another supported model.
5. Run `npm run dev` and open `http://localhost:3000`.

The workspace preview can be explored without configuring credentials. Project history is saved in this browser.

Generated projects include `package.json`, `tsconfig.json`, `next.config.ts`, `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `postcss.config.mjs`, and `supabase/schema.sql`. Use the Code view to browse and copy generated files. Database tables and row-level security policies are added to the SQL file when an app needs persistent data.
