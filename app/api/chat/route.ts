import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ProjectFile = {
  path: string;
  content: string;
};

type ChatRequest = {
  messages?: unknown;
  files?: unknown;
};

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const accessToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return NextResponse.json({ error: "Sign in is required to build an app." }, { status: 401 });
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase authentication is not configured." }, { status: 503 });
  }
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      return NextResponse.json({ error: "Your session is invalid or expired. Please sign in again." }, { status: 401 });
    }
  } catch (error) {
    console.error("Could not verify the Supabase session:", error);
    return NextResponse.json({ error: "Could not verify your session. Please try again." }, { status: 503 });
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    return NextResponse.json(
      { error: "Cloudflare Workers AI is not configured. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to .env.local." },
      { status: 503 }
    );
  }

  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 12) {
    return NextResponse.json({ error: "Provide between 1 and 12 chat messages." }, { status: 400 });
  }
  const validMessages = body.messages.every(
    (message): message is ChatMessage =>
      typeof message === "object" &&
      message !== null &&
      "role" in message &&
      (message.role === "user" || message.role === "assistant") &&
      "content" in message &&
      typeof message.content === "string" &&
      message.content.trim().length > 0 &&
      message.content.length <= 8000
  );
  if (!validMessages) {
    return NextResponse.json({ error: "Each chat message must have a valid role and non-empty content." }, { status: 400 });
  }
  const messages = body.messages as ChatMessage[];
  if (messages.reduce((total, message) => total + message.content.length, 0) > 16000) {
    return NextResponse.json({ error: "The conversation is too long to send." }, { status: 413 });
  }
  if (!Array.isArray(body.files) || body.files.length > 24) {
    return NextResponse.json({ error: "Provide no more than 24 current project files." }, { status: 400 });
  }
  const validFiles = body.files.every(
    (file): file is ProjectFile =>
      typeof file === "object" &&
      file !== null &&
      "path" in file &&
      typeof file.path === "string" &&
      /^[a-zA-Z0-9._/-]+$/.test(file.path) &&
      !file.path.startsWith("/") &&
      !file.path.split("/").includes("..") &&
      "content" in file &&
      typeof file.content === "string" &&
      file.content.length <= 16000
  );
  if (!validFiles) {
    return NextResponse.json({ error: "Each project file must have a safe relative path and valid content." }, { status: 400 });
  }
  const files = body.files as ProjectFile[];
  if (files.reduce((total, file) => total + file.content.length, 0) > 50000) {
    return NextResponse.json({ error: "The project files are too large to send." }, { status: 413 });
  }

  try {
    const providerResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.CLOUDFLARE_AI_MODEL || "@cf/mistralai/mistral-small-3.1-24b-instruct",
          messages: [
            {
              role: "system",
              content: `You are Morrow, an expert senior product engineer and interface designer. First inspect the user's request and current project files. If the current project files array is empty, this is a brand-new project: create it entirely from scratch and do not reuse sample/template code or content from prior projects. Then build or modify a complete, production-quality Next.js application. Do not produce a generic landing-page template or shallow demo. Use semantic HTML5, Tailwind CSS v4 utilities, CSS3, React/TypeScript interactions, accessible controls, responsive layouts, and realistic product content. Quality requirements:
- Before coding, understand the product category, business goals, target audience, and the user's primary tasks. Choose a product-specific visual direction, define reusable design tokens (color, type, spacing, radii, elevation, and motion), and plan the complete page structure and key interactions.
- Treat every request as a design problem, not an invitation to fill a familiar layout. Identify the target user, the job they need to do, and one product-specific idea that could make the experience more useful, memorable, or delightful.
- Establish a coherent visual direction that fits the product, with deliberate choices for layout, typography, color, spacing, imagery, and motion. Modern does not automatically mean gradients, glass effects, oversized hero text, or rounded-card grids; use these only when they serve the concept. Avoid generic landing-page sections, repeated card grids, stock dashboard patterns, filler copy, and decorative controls.
- Give the app a useful signature moment: an interaction, visualization, workflow, or content presentation that feels specific to this product. Keep it practical and understandable; originality should make the experience clearer or more engaging, not harder to use.
- Build complete product experiences, not just hero screens: use realistic copy/data and include the important sections, workflows, and states implied by the request.
- On the first generation of a web app (when the current project files array is empty), plan and implement at least 5 distinct, useful pages, including the home page. Each must be a real Next.js App Router route, not a hidden section or a single-page mock. Choose pages appropriate to the product (for example, product, features, pricing, resources, or contact pages for a marketing site; or overview, core workflow, records, analytics, and settings for a product app). Give every page realistic, substantial, product-specific content and a distinct purpose. Reuse a shared responsive header, navigation, footer, and components; ensure every navigation link targets a real generated route and indicates the current page. Include the root app/page.tsx and every route's complete source file in "files".
- For subsequent requests on an existing project, preserve its established sitemap unless the user asks to change it; when adding a multi-page experience, plan the routes before coding and implement each as a real Next.js App Router route with complete, distinct content.
- In the standalone HTML preview, represent every principal route and make navigation genuinely usable without a server: use hash-based routes, render the correct page for the current hash, and support browser back/forward. Keep the preview's information architecture and visual direction aligned with the generated Next.js routes.
- Make controls functional, with coherent loading, success, empty, and error states where relevant. No decorative buttons, dead links, href="#", or controls with no behavior.
- Build for production use, not just a convincing screenshot: implement the requested workflows end to end, validate user input, provide actionable error feedback, and handle loading, empty, success, and failure states. Use secure, appropriately scoped data access and row-level security for Supabase persistence. Do not present mocked or incomplete integrations as working functionality.
- Prefer shadcn/ui components and conventions for common interface patterns when they fit the product. Since generated projects may not have shadcn/ui configured, include the component source and any required dependencies in the returned project, or implement an accessible equivalent; never import unavailable components or assume a CLI setup.
- Use lucide-react for interface icons where appropriate. Keep icons consistent in size and stroke, provide accessible labels for icon-only controls, and do not substitute emoji or arbitrary Unicode characters for icons.
- Build desktop and mobile layouts deliberately, with keyboard access, semantic landmarks, clear focus states, and no clipped content or horizontal overflow.
- Use meaningful, high-quality visual assets when they materially improve the product. When image-generation capability is available, create original, art-directed images that match the product's visual identity; otherwise use suitable non-figure assets or intentional CSS/SVG artwork, and never leave broken or blank image blocks. Never generate or include images depicting humans or animals, including faces, bodies, silhouettes, or figures; use objects, architecture, landscapes, food, abstract compositions, or product imagery instead. Use real, plausible names and copy; never use Lorem Ipsum or "coming soon" placeholders.
- After implementation, review the complete user journey and all routes at desktop and mobile sizes; check responsive layouts, visual hierarchy, spacing, typography, asset loading, keyboard/focus behavior, functionality, and consistency between the preview and source. If browser rendering is available, inspect the rendered app and correct visible issues before finishing. Otherwise, perform a careful code-level review and do not claim browser validation. Confirm the app's purpose is immediately clear, the next action is obvious, and nothing is generic, ornamental, or nonfunctional. In "reply", briefly explain the product-specific idea and key UX choices.
- Preserve existing behavior and design unless the user asks to change them. For edits, inspect and update existing files rather than replacing working features with a fresh mock.
- Keep code runnable: check imports, TypeScript/JSX syntax, Next.js route conventions, Tailwind utilities, file paths, and accessibility. Avoid adding dependencies unless needed.
- Always include package.json, tsconfig.json, next.config.ts, app/layout.tsx, app/page.tsx, app/globals.css, postcss.config.mjs, and supabase/schema.sql. Add only necessary shared components, route files, and supporting assets/configuration.
- The SQL file must contain Supabase/PostgreSQL DDL and RLS policies when persistence is needed; otherwise leave a short SQL comment.
Before returning, self-review the user journey across every route, responsive behavior, visual consistency, syntax, accessibility, and whether the preview matches the actual app.
Return a JSON object with exactly three properties:
"reply": a concise summary of what changed,
"html": a complete standalone HTML5 preview that matches the app, includes inline CSS and working JavaScript behavior, is fully responsive, polished, includes functional hash-based navigation for all principal pages, and is no more than 16,000 characters,
"files": an array of complete source files with "path" and "content"; maximum 24 files and 50,000 total characters. For multi-page projects, include a complete source file for each route.
Do not use Markdown fences or comments about unavailable features. Current project files:\n${JSON.stringify(files)}`
            },
            ...messages
          ],
          temperature: 0.2,
          top_p: 0.9,
          max_tokens: 12000,
          response_format: { type: "json_object" }
        })
      }
    );

    const result = (await providerResponse.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
      errors?: { message?: string }[];
    };
    if (!providerResponse.ok) {
      return NextResponse.json(
        { error: result.error?.message ?? result.errors?.[0]?.message ?? "Cloudflare Workers AI could not complete this request." },
        { status: providerResponse.status }
      );
    }

    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "The AI provider returned an empty response." }, { status: 502 });
    }
    let generated: { reply?: unknown; html?: unknown; files?: unknown };
    try {
      generated = JSON.parse(content) as { reply?: unknown; html?: unknown };
    } catch {
      return NextResponse.json({ error: "The AI provider returned an invalid project update." }, { status: 502 });
    }
    if (
      typeof generated.reply !== "string" ||
      typeof generated.html !== "string" ||
      !generated.html.trim() ||
      generated.html.length > 16000 ||
      !Array.isArray(generated.files) ||
      generated.files.length === 0 ||
      generated.files.length > 24
    ) {
      return NextResponse.json({ error: "The AI provider returned an incomplete project update." }, { status: 502 });
    }
    const generatedFiles = generated.files;
    const validGeneratedFiles = generatedFiles.every(
      (file): file is ProjectFile =>
        typeof file === "object" &&
        file !== null &&
        "path" in file &&
        typeof file.path === "string" &&
        /^[a-zA-Z0-9._/-]+$/.test(file.path) &&
        !file.path.startsWith("/") &&
        !file.path.split("/").includes("..") &&
        "content" in file &&
        typeof file.content === "string" &&
        file.content.length <= 16000
    );
    if (
      !validGeneratedFiles ||
      new Set(generatedFiles.map((file) => file.path)).size !== generatedFiles.length ||
      generatedFiles.reduce((total, file) => total + file.content.length, 0) > 50000 ||
      !["package.json", "tsconfig.json", "next.config.ts", "app/layout.tsx", "app/page.tsx", "app/globals.css", "postcss.config.mjs", "supabase/schema.sql"].every(
        (path) => generatedFiles.some((file) => file.path === path)
      )
    ) {
      return NextResponse.json({ error: "The AI provider returned invalid or incomplete project files." }, { status: 502 });
    }
    return NextResponse.json({
      reply: generated.reply,
      html: generated.html,
      files: generatedFiles
    });
  } catch (error) {
    console.error("AI chat request failed:", error);
    return NextResponse.json({ error: "Could not reach the AI provider. Please try again." }, { status: 502 });
  }
}
