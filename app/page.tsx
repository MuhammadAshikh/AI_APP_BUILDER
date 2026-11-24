"use client";

import {
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  Clock3,
  Code2,
  FileCode2,
  Files,
  Globe2,
  LayoutPanelLeft,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  Smartphone,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import {
  CSSProperties,
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

type AccountUser = {
  id: string;
  email: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
};

type ProjectFile = {
  path: string;
  content: string;
};

type Conversation = {
  id: string;
  title: string;
  updatedAt: string;
  messages: Message[];
  html?: string;
  files?: ProjectFile[];
  isNewProject?: boolean;
};

type ProjectRow = {
  id: string;
  title: string;
  updated_at: string;
  messages: Message[];
  html: string | null;
  files: ProjectFile[];
  is_new_project: boolean;
};

type WorkspaceTab = "preview" | "code";

const now = () => new Date().toISOString();
const formatTime = (date: string) =>
  new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(
    new Date(date)
  );
const formatDate = (date: string) => {
  const today = new Date();
  const value = new Date(date);
  if (value.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (value.toDateString() === yesterday.toDateString()) return "Yesterday";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(value);
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

function cleanPlanText(plan: string): string {
  return plan
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/^[*-]{3}\s*$/gm, "")
    .trim();
}

function keepPreviewNavigationLocal(html: string): string {
  return html
    .replace(
      /(<a\b[^>]*\bhref\s*=\s*)(["'])\/(?!\/)([^"']*)\2/gi,
      (_match, prefix: string, quote: string, path: string) => `${prefix}${quote}#/${path}${quote}`
    )
    .replace(
      /(<form\b[^>]*\baction\s*=\s*)(["'])\/(?!\/)([^"']*)\2/gi,
      (_match, prefix: string, quote: string, path: string) => `${prefix}${quote}#/${path}${quote}`
    );
}

const starterMessages: Message[] = [
  {
    id: "starter-note",
    role: "assistant",
    content:
      "Hey! I’m here to help you turn an idea into something real. Tell me what you’re imagining, and we’ll make it happen together.",
    time: now()
  },
  {
    id: "starter-prompt",
    role: "assistant",
    content: "Try asking me to build a landing page, dashboard, or something completely new.",
    time: now()
  }
];

const starterProjectFiles: ProjectFile[] = [
  {
    path: "package.json",
    content: `{
  "name": "north-studio",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "build:cloudflare": "opennextjs-cloudflare build",
    "preview": "opennextjs-cloudflare preview",
    "deploy": "opennextjs-cloudflare deploy"
  },
  "dependencies": {
    "@tailwindcss/postcss": "^4.1.11",
    "next": "^15.5.0",
    "postcss": "^8.5.33",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "tailwindcss": "^4.1.11"
  },
  "devDependencies": {
    "@opennextjs/cloudflare": "^1.20.18",
    "@types/node": "^22.15.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "typescript": "^5.8.3",
    "wrangler": "^4.166.0"
  }
}`
  },
  {
    path: "next.config.ts",
    content: `import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {};

initOpenNextCloudflareForDev();

export default nextConfig;`
  },
  {
    path: "tsconfig.json",
    content: `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`
  },
  {
    path: "app/layout.tsx",
    content: `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "North Studio — Spaces made for living",
  description: "Thoughtful architecture for everyday life."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`
  },
  {
    path: "app/page.tsx",
    content: `const projects = [
  { name: "House on the hill", type: "Private home", year: "2025" },
  { name: "The soft corner", type: "Interior", year: "2024" },
  { name: "Summer, slowly", type: "Cabin", year: "2023" }
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f5f2ea] text-[#242d26]">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-7">
        <a className="flex items-center gap-2 font-semibold" href="#">
          <span className="grid size-6 place-items-center rounded-full bg-[#d3ddc8]">n</span>
          north / studio
        </a>
        <nav aria-label="Main navigation" className="flex gap-6 text-sm text-stone-600">
          <a href="#work">Work</a><a href="#about">About</a><a href="mailto:hello@north.studio">Contact</a>
        </nav>
      </header>
      <section id="about" className="mx-auto grid max-w-5xl gap-10 px-6 py-20 md:grid-cols-[1.2fr_.8fr] md:items-center">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-[#73816d]">Independent architecture · Copenhagen</p>
          <h1 className="mt-5 max-w-xl font-serif text-5xl leading-none tracking-tight md:text-7xl">Spaces made for the way we live.</h1>
          <p className="mt-6 max-w-sm leading-7 text-stone-600">We create thoughtful spaces for everyday life. Considered, crafted, and connected to their surroundings.</p>
          <a className="mt-7 inline-flex rounded-sm bg-[#3d5143] px-5 py-3 text-sm text-white" href="#work">Explore our work ↗</a>
        </div>
        <div className="flex min-h-72 items-end rounded-sm bg-[#d9d4c8] bg-cover bg-center p-4 text-sm text-white" style={{ backgroundImage: "linear-gradient(0deg,#34473855,transparent 65%), url(https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1100&q=85)" }}>01 / A quieter kind of home</div>
      </section>
      <section id="work" className="mx-auto max-w-5xl border-t border-[#e1ded6] px-6 py-8">
        <h2 className="mb-6 font-serif text-2xl">A few recent projects</h2>
        <ul className="grid gap-5 sm:grid-cols-3">
          {projects.map((project, index) => (
            <li key={project.name}>
              <div aria-hidden="true" className={\`h-32 rounded-sm \${["bg-[#e0ddd4]", "bg-[#ddd6c9]", "bg-[#d5dacd]"][index]}\`} />
              <h3 className="mt-3 font-serif">{project.name}</h3>
              <p className="text-sm text-stone-500">{project.type} · {project.year}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}`
  },
  {
    path: "app/globals.css",
    content: `@import "tailwindcss";

:root {
  color-scheme: light;
  font-family: Arial, Helvetica, sans-serif;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
}

a:focus-visible {
  outline: 2px solid #536e59;
  outline-offset: 3px;
}`
  },
  {
    path: "postcss.config.mjs",
    content: `export default {
  plugins: {
    "@tailwindcss/postcss": {}
  }
};`
  },
  {
    path: "wrangler.jsonc",
    content: `{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "generated-app",
  "main": ".open-next/worker.js",
  "compatibility_date": "2025-03-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "generated-app-db",
      "database_id": "REPLACE_WITH_D1_DATABASE_ID",
      "migrations_dir": "migrations"
    }
  ]
}`
  },
  {
    path: "migrations/0001_initial.sql",
    content: `-- Add Cloudflare D1 SQLite tables here when this project needs persistent data.`
  }
];

const initialConversations: Conversation[] = [
  {
    id: "studio-landing",
    title: "A landing page for Studio North",
    updatedAt: now(),
    files: starterProjectFiles,
    messages: [
      {
        id: "north-1",
        role: "user",
        content:
          "Create a calm, editorial landing page for a small architecture studio. Warm colors, oversized type, and a project grid.",
        time: now()
      },
      {
        id: "north-2",
        role: "assistant",
        content:
          "I shaped this into a warm, minimal studio site with an editorial hero, soft paper tones, and a three-project gallery. It’s ready to explore in the preview.",
        time: now()
      }
    ]
  },
  {
    id: "habit-tracker",
    title: "Habit tracker with a soft touch",
    updatedAt: now(),
    messages: [
      {
        id: "habit-1",
        role: "user",
        content: "Make a gentle habit tracker with daily streaks and a cozy, encouraging feel.",
        time: now()
      },
      {
        id: "habit-2",
        role: "assistant",
        content: "A cozy daily tracker is ready, with small wins, a weekly rhythm, and plenty of breathing room.",
        time: now()
      }
    ]
  },
  {
    id: "coffee-shop",
    title: "Neighborhood coffee shop",
    updatedAt: now(),
    messages: [
      {
        id: "coffee-1",
        role: "user",
        content: "Design a welcoming website for an independent neighborhood coffee shop.",
        time: now()
      },
      {
        id: "coffee-2",
        role: "assistant",
        content: "The coffee shop homepage has a welcoming hero, a simple menu, and a neighborhood-first feel.",
        time: now()
      }
    ]
  }
];

const previewMarkup = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #f5f2ea; color: #242d26; font: 15px/1.6 Inter, ui-sans-serif, system-ui, sans-serif; }
  nav { max-width: 1030px; margin: auto; padding: 27px 38px; display: flex; justify-content: space-between; align-items: center; }
  .brand { display: flex; align-items: center; gap: 9px; font-size: 15px; font-weight: 650; letter-spacing: -.5px; }
  .mark { width: 23px; height: 23px; border-radius: 50%; display: grid; place-items: center; background: #d3ddc8; color: #415344; font-size: 13px; }
  nav a { color: #62685d; text-decoration: none; font-size: 12px; margin-left: 24px; }
  .hero { max-width: 1030px; margin: 0 auto; padding: 79px 38px 59px; display: grid; grid-template-columns: 1.18fr .82fr; gap: 40px; align-items: center; }
  .eyebrow { color: #73816d; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; font-weight: 650; }
  h1 { font-family: Georgia, serif; font-weight: 400; font-size: clamp(42px, 6vw, 69px); line-height: .99; letter-spacing: -3.4px; max-width: 560px; margin: 19px 0 20px; }
  .copy { max-width: 375px; color: #6e746b; font-size: 13px; line-height: 1.8; }
  .cta { margin-top: 25px; padding: 12px 19px; display: inline-flex; gap: 14px; align-items: center; border-radius: 3px; background: #3d5143; color: white; text-decoration: none; font-size: 11px; }
  .photo { height: 289px; border-radius: 3px; background: linear-gradient(0deg, #34473835, transparent 75%), url('https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1100&q=85') center 53%/cover, #d9d4c8; position: relative; }
  .caption { position: absolute; bottom: 13px; left: 15px; font-size: 10px; color: white; letter-spacing: .5px; }
  .projects { max-width: 1030px; margin: auto; padding: 30px 38px 80px; border-top: 1px solid #e1ded6; }
  .section-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 20px; }
  .section-head strong { font-family: Georgia, serif; font-size: 20px; font-weight: 400; }
  .section-head span { color: #82867d; font-size: 10px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 13px; }
  .tile { height: 126px; background: #e0ddd4; border-radius: 2px; }
  .tile:nth-child(2) { background: #ddd6c9; }
  .tile:nth-child(3) { background: #d5dacd; }
  .project-name { font-family: Georgia, serif; font-size: 14px; margin: 9px 0 2px; }
  .project-type { color: #81857a; font-size: 10px; margin: 0; }
  @media(max-width: 650px) { .hero { grid-template-columns: 1fr; padding-top: 52px; } .photo { height: 220px; } .projects { padding-top: 12px; } nav, .hero, .projects { padding-left: 22px; padding-right: 22px; } .grid { grid-template-columns: 1fr 1fr; } .tile { height: 100px; } .tile:last-child { display: none; } }
</style>
</head>
<body>
  <nav><div class="brand"><span class="mark">n</span> north / studio</div><div><a href="#">Work</a><a href="#">About</a><a href="#">Contact ↗</a></div></nav>
  <main>
    <section class="hero">
      <div><div class="eyebrow">Independent architecture · Copenhagen</div><h1>Spaces made for the way we live.</h1><p class="copy">We’re an independent architecture studio creating thoughtful spaces for everyday life. Considered, crafted, and connected to their surroundings.</p><a class="cta" href="#">Explore our work <span>↗</span></a></div>
      <div class="photo"><span class="caption">01 / A quieter kind of home</span></div>
    </section>
    <section class="projects"><div class="section-head"><strong>A few recent projects</strong><span>2022 — 2025</span></div><div class="grid"><div><div class="tile"></div><p class="project-name">House on the hill</p><p class="project-type">Private home · 2025</p></div><div><div class="tile"></div><p class="project-name">The soft corner</p><p class="project-type">Interior · 2024</p></div><div><div class="tile"></div><p class="project-name">Summer, slowly</p><p class="project-type">Cabin · 2023</p></div></div></section>
  </main>
</body>
</html>`;

function makeMessage(role: Message["role"], content: string): Message {
  return { id: crypto.randomUUID(), role, content, time: now() };
}

export default function Home() {
  const [view, setView] = useState<"landing" | "workspace">("landing");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("preview");
  const [prompt, setPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [landingPrompt, setLandingPrompt] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [user, setUser] = useState<AccountUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatPaneWidth, setChatPaneWidth] = useState<number | null>(null);
  const [isResizingPanes, setIsResizingPanes] = useState(false);
  const [isChatAtLatest, setIsChatAtLatest] = useState(true);
  const [landingSidebarOpen, setLandingSidebarOpen] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [previewWidth, setPreviewWidth] = useState<"desktop" | "mobile">("desktop");
  const [previewVersion, setPreviewVersion] = useState(0);
  const [copied, setCopied] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [historyOwnerId, setHistoryOwnerId] = useState<string | null>(null);
  const [projectsLoadedForUser, setProjectsLoadedForUser] = useState<string | null>(null);
  const [projectSyncStatus, setProjectSyncStatus] = useState<"loading" | "saving" | "saved" | "error">("loading");
  const [projectSyncError, setProjectSyncError] = useState("");
  const [projectLoadAttempt, setProjectLoadAttempt] = useState(0);
  const [projectSaveAttempt, setProjectSaveAttempt] = useState(0);
  const [previewCode, setPreviewCode] = useState("");
  const [selectedFilePath, setSelectedFilePath] = useState("app/page.tsx");
  const [pendingPlan, setPendingPlan] = useState<{ conversationId: string; request: string; plan: string } | null>(null);
  const [planningMode, setPlanningMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isChatAtLatestRef = useRef(true);
  const chatContentRef = useRef<HTMLDivElement>(null);
  const studioLayoutRef = useRef<HTMLDivElement>(null);
  const chatPaneRef = useRef<HTMLElement>(null);
  const landingPromptRef = useRef<HTMLTextAreaElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const historySearchInputRef = useRef<HTMLInputElement>(null);
  const projectSaveQueueRef = useRef(Promise.resolve());
  const savedProjectVersionsRef = useRef(new Map<string, number>());
  const currentUserIdRef = useRef<string | null>(null);
  const applyAuthUser = useCallback((nextUser: AccountUser | null) => {
    const nextUserId = nextUser?.id ?? null;
    if (currentUserIdRef.current !== nextUserId) {
      setConversations([]);
      setActiveId("");
      setHistoryOwnerId(null);
      setProjectsLoadedForUser(null);
      savedProjectVersionsRef.current.clear();
      if (!nextUser) {
        setView("landing");
        setPrompt("");
      }
    }
    currentUserIdRef.current = nextUserId;
    setUser(nextUser);
  }, []);

  const activeConversation = conversations.find((item) => item.id === activeId);
  const messages = activeConversation?.messages ?? [];
  const projectFiles = activeConversation?.files ?? [];
  const selectedFile = projectFiles.find((file) => file.path === selectedFilePath) ?? projectFiles[0];
  const getChatPaneWidthBounds = () => {
    const layout = studioLayoutRef.current?.getBoundingClientRect();
    const chatPane = chatPaneRef.current?.getBoundingClientRect();
    if (!layout || !chatPane) return null;
    const narrow = window.innerWidth <= 1120;
    const wide = window.innerWidth >= 1500;
    const minimumChatWidth = narrow ? 320 : wide ? 390 : 345;
    const minimumWorkbenchWidth = narrow ? 390 : wide ? 590 : 480;
    const maximumChatWidth = layout.right - chatPane.left - minimumWorkbenchWidth - 8;
    return { minimumChatWidth, maximumChatWidth };
  };
  const resizeChatPane = (clientX: number) => {
    const chatPane = chatPaneRef.current?.getBoundingClientRect();
    const bounds = getChatPaneWidthBounds();
    if (!chatPane || !bounds || bounds.maximumChatWidth < bounds.minimumChatWidth) return;
    setChatPaneWidth(
      Math.max(bounds.minimumChatWidth, Math.min(clientX - chatPane.left, bounds.maximumChatWidth))
    );
  };
  const currentChatPaneWidth =
    chatPaneWidth ?? chatPaneRef.current?.getBoundingClientRect().width ?? 345;
  const chatPaneWidthBounds = getChatPaneWidthBounds();

  useEffect(() => {
    let cancelled = false;
    const loadAuthSession = async () => {
      try {
        const response = await fetch("/api/auth", { cache: "no-store" });
        const result = (await response.json()) as { user?: AccountUser | null; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not check your sign-in session.");
        if (!cancelled) applyAuthUser(result.user ?? null);
      } catch (error) {
        console.error("Could not read the D1 account session:", error);
        if (!cancelled) applyAuthUser(null);
      } finally {
        if (!cancelled) setAuthLoaded(true);
      }
    };
    void loadAuthSession();
    return () => {
      cancelled = true;
    };
  }, [applyAuthUser]);

  useEffect(() => {
    try {
      window.localStorage.removeItem("hamshake-conversations");
      for (const key of Object.keys(window.localStorage)) {
        if (key.startsWith("sb-")) window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error("Could not remove legacy project and auth data from local storage:", error);
    }
  }, []);

  useEffect(() => {
    if (!authLoaded) return;
    if (!user) {
      setConversations([]);
      setActiveId("");
      setHistoryOwnerId(null);
      setProjectsLoadedForUser(null);
      setProjectSyncError("");
      return;
    }

    let cancelled = false;
    const loadProjects = async () => {
      setProjectSyncStatus("loading");
      setProjectSyncError("");
      try {
        const response = await fetch("/api/projects", {
          credentials: "same-origin",
          cache: "no-store"
        });
        const result = (await response.json()) as { projects?: ProjectRow[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not load projects.");
        if (!Array.isArray(result.projects)) throw new Error("The project service returned invalid data.");

        const cloudRows = result.projects;
        if (cancelled) return;
        savedProjectVersionsRef.current = new Map(
          cloudRows.map((project) => [project.id, Date.parse(project.updated_at)])
        );
        const restoredProjects: Conversation[] = cloudRows.map((project) => ({
          id: project.id,
          title: project.title,
          updatedAt: project.updated_at,
          messages: project.messages,
          html: project.html ?? undefined,
          files: project.files,
          isNewProject: project.is_new_project
        }));
        setConversations(restoredProjects);
        setActiveId(restoredProjects[0]?.id ?? "");
        setHistoryOwnerId(user.id);
        setProjectsLoadedForUser(user.id);
        setProjectSyncStatus("saved");
      } catch (error) {
        if (cancelled) return;
        const detail = getErrorMessage(error, "Could not load projects from Cloudflare D1.");
        console.warn("Could not load Cloudflare D1 projects:", error);
        setProjectSyncError(detail);
        setProjectSyncStatus("error");
      }
    };

    void loadProjects();
    return () => {
      cancelled = true;
    };
  }, [authLoaded, projectLoadAttempt, user]);

  useEffect(() => {
    if (!user || historyOwnerId !== user.id || projectsLoadedForUser !== user.id) return;
    const projects = conversations.filter(
      (project) => savedProjectVersionsRef.current.get(project.id) !== Date.parse(project.updatedAt)
    );
    if (projects.length === 0) return;

    const userId = user.id;
    const rows = projects.map((project) => ({
      id: project.id,
      title: project.title,
      updated_at: project.updatedAt,
      messages: project.messages,
      html: project.html ?? null,
      files: project.files ?? [],
      is_new_project: project.isNewProject ?? false
    }));

    setProjectSyncStatus("saving");
    const timer = window.setTimeout(() => {
      projectSaveQueueRef.current = projectSaveQueueRef.current
        .then(async () => {
          const response = await fetch("/api/projects", {
            method: "PUT",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ projects: rows })
          });
          const result = (await response.json()) as { error?: string };
          if (!response.ok) throw new Error(result.error ?? "Could not save projects.");
          rows.forEach((row) => savedProjectVersionsRef.current.set(row.id, Date.parse(row.updated_at)));
          if (currentUserIdRef.current === userId) {
            setProjectSyncStatus("saved");
            setProjectSyncError("");
          }
        })
        .catch((error: unknown) => {
          const detail = getErrorMessage(error, "Could not save projects to Cloudflare D1.");
          console.warn("Could not save Cloudflare D1 projects:", error);
          if (currentUserIdRef.current === userId) {
            setProjectSyncError(detail);
            setProjectSyncStatus("error");
          }
        });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [conversations, historyOwnerId, projectSaveAttempt, projectsLoadedForUser, user]);

  useEffect(() => {
    if (isChatAtLatestRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isSending]);

  useEffect(() => {
    isChatAtLatestRef.current = true;
    setIsChatAtLatest(true);
    messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [activeId]);

  const handleChatScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const atLatest = element.scrollHeight - element.scrollTop - element.clientHeight < 96;
    isChatAtLatestRef.current = atLatest;
    setIsChatAtLatest(atLatest);
  };

  const scrollChatToLatest = () => {
    isChatAtLatestRef.current = true;
    setIsChatAtLatest(true);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  useEffect(() => {
    setPreviewCode(activeConversation?.html ?? "");
    setSelectedFilePath(activeConversation?.files?.[0]?.path ?? "app/page.tsx");
  }, [activeId, activeConversation?.html, activeConversation?.files, activeConversation?.isNewProject]);

  useEffect(() => {
    if (projectFiles.length === 0 && activeTab === "code") {
      setActiveTab("preview");
    }
  }, [activeTab, projectFiles.length]);

  const openLandingChat = useCallback(() => {
    setLandingPrompt("");
    setView("landing");
    window.requestAnimationFrame(() => {
      landingPromptRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      landingPromptRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 860px)");
    let compact = false;
    const updateLayout = () => {
      if (mediaQuery.matches !== compact) {
        compact = mediaQuery.matches;
        setSidebarOpen(!compact);
      }
      setIsCompactLayout(compact);
    };

    updateLayout();
    mediaQuery.addEventListener("change", updateLayout);
    return () => mediaQuery.removeEventListener("change", updateLayout);
  }, []);

  const requireSignIn = useCallback(() => {
    if (user) return true;
    setAuthMode("signin");
    setAuthMessage("Sign in to build and save your project. Your idea will stay in the prompt.");
    setIsAuthOpen(true);
    return false;
  }, [user]);

  useEffect(() => {
    const handleNewProjectShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openLandingChat();
        return;
      }

      const target = event.target;
      const isEditing = target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA"].includes(target.tagName));
      if (event.key === "/" && !isEditing) {
        event.preventDefault();
        historySearchInputRef.current?.focus();
      } else if (event.key === "Escape" && view === "landing" && landingSidebarOpen) {
        setLandingSidebarOpen(false);
      } else if (event.key === "Escape" && isCompactLayout && sidebarOpen) {
        setSidebarOpen(false);
      } else if (event.key === "Escape" && document.activeElement === historySearchInputRef.current) {
        setHistorySearch("");
        historySearchInputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleNewProjectShortcut);
    return () => window.removeEventListener("keydown", handleNewProjectShortcut);
  }, [isCompactLayout, landingSidebarOpen, openLandingChat, sidebarOpen, view]);

  useEffect(() => {
    if (view === "landing") {
      window.requestAnimationFrame(() => landingPromptRef.current?.focus());
    }
  }, [view]);

  useEffect(() => {
    if (!user) setLandingSidebarOpen(false);
  }, [user]);

  const createConversation = useCallback(() => {
    if (!requireSignIn()) return null;
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      title: "Untitled project",
      updatedAt: now(),
      messages: [],
      files: [],
      isNewProject: true
    };
    setConversations((existing) => [conversation, ...existing]);
    setActiveId(conversation.id);
    setActiveTab("preview");
    setView("workspace");
    setPrompt("");
    return conversation.id;
  }, [requireSignIn]);

  const sendMessage = async (
    messageText?: string,
    targetConversationId?: string,
    mode: "plan" | "build" = "build"
  ) => {
    const text = (messageText ?? prompt).trim();
    if (!text || isSending) return;
    if (!requireSignIn()) return;

    let conversationId = targetConversationId ?? activeId;
    const targetConversation = conversations.find((item) => item.id === conversationId);
    const shouldCreateConversation = !targetConversation && !targetConversationId;
    if (shouldCreateConversation) {
      conversationId = crypto.randomUUID();
      const fresh: Conversation = {
        id: conversationId,
        title: text.length > 34 ? `${text.slice(0, 34)}…` : text,
        updatedAt: now(),
        messages: [],
        files: [],
        isNewProject: true
      };
      setConversations((existing) => [fresh, ...existing]);
      setActiveId(conversationId);
    }

    const currentFiles =
      targetConversation?.files ?? (targetConversationId || shouldCreateConversation ? [] : projectFiles);
    const message = makeMessage("user", text);
    const id = conversationId;
    setConversations((existing) =>
      existing.map((item) =>
        item.id === id
          ? {
              ...item,
              title: item.messages.length === 0 || item.title === "Untitled project"
                ? text.length > 34 ? `${text.slice(0, 34)}…` : text
                : item.title,
              updatedAt: now(),
              messages: [...item.messages, message]
            }
          : item
      )
    );
    setPrompt("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          files: currentFiles,
          mode,
          messages: [
            ...(targetConversation?.messages ?? [])
              .filter((item) => item.id !== "starter-note" && item.id !== "starter-prompt")
              .slice(-10)
              .map(({ role, content }) => ({ role, content })),
            { role: "user", content: text }
          ]
        })
      });
      const result = (await response.json()) as {
        reply?: string;
        html?: string;
        files?: ProjectFile[];
        plan?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(result.error ?? "The assistant could not respond. Please try again.");
      }
      if (mode === "plan") {
        if (!result.reply || !result.plan) {
          throw new Error(result.error ?? "The assistant could not create a plan.");
        }
        const reply = makeMessage("assistant", result.reply);
        setPendingPlan({ conversationId: id, request: text, plan: result.plan });
        setConversations((existing) =>
          existing.map((item) =>
            item.id === id
              ? { ...item, updatedAt: now(), messages: [...item.messages, reply] }
              : item
          )
        );
        setActiveTab("preview");
        setIsSending(false);
        return;
      }
      if (!response.ok || !result.reply || !result.html || !result.files?.length) {
        throw new Error(result.error ?? "The assistant could not respond. Please try again.");
      }
      setPreviewCode(result.html);
      setSelectedFilePath(result.files[0].path);
      const reply = makeMessage("assistant", result.reply);
      setConversations((existing) =>
        existing.map((item) =>
          item.id === id
            ? {
                ...item,
                updatedAt: now(),
                html: result.html,
                files: result.files,
                messages: [...item.messages, reply]
              }
            : item
        )
      );
      setActiveTab("preview");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Something went wrong.";
      const reply = makeMessage(
        "assistant",
        `${detail} You can revise your request and try again, or configure the AI settings in the project environment.`
      );
      setConversations((existing) =>
        existing.map((item) =>
          item.id === id
            ? { ...item, updatedAt: now(), messages: [...item.messages, reply] }
            : item
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  const startProjectFromLanding = (idea = landingPrompt) => {
    const initialPrompt = idea.trim();
    if (!initialPrompt) {
      landingPromptRef.current?.focus();
      return;
    }
    if (!requireSignIn()) return;
    const conversationId = createConversation();
    if (!conversationId) return;
    setLandingPrompt("");
    void sendMessage(initialPrompt, conversationId, "plan");
  };

  const onPromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const mode = planningMode ? "plan" : "build";
      setPlanningMode(false);
      void sendMessage(undefined, undefined, mode);
    }
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthMessage("");
    setAuthBusy(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: authMode, email: authEmail, password: authPassword })
      });
      const result = (await response.json()) as { user?: AccountUser; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Authentication failed. Please try again.");
      if (!result.user) throw new Error("The authentication service returned no account.");
      applyAuthUser(result.user);
      setIsAuthOpen(false);
      setAuthPassword("");
      setAuthMessage("");
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Authentication failed. Please try again.");
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    try {
      const response = await fetch("/api/auth", {
        method: "DELETE",
        credentials: "same-origin"
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not sign out. Please try again.");
      applyAuthUser(null);
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Could not sign out. Please try again.");
      setIsAuthOpen(true);
    }
  };

  const filteredConversations = conversations.filter((conversation) =>
    conversation.title.toLowerCase().includes(historySearch.toLowerCase())
  );
  const groupedConversations = filteredConversations.reduce<Record<string, Conversation[]>>(
    (groups, conversation) => {
      const group = formatDate(conversation.updatedAt);
      groups[group] = [...(groups[group] ?? []), conversation];
      return groups;
    },
    {}
  );
  const renderProjectsNavigation = (landing = false) => (
    <aside
      className={`sidebar${landing ? " landing-sidebar" : ""}`}
      id={landing ? "landing-projects-navigation" : "projects-navigation"}
      aria-label="Project navigation"
    >
      <div className="sidebar-section-heading">
        <span>Your projects</span>
      </div>

      <div className="history-heading">
        <div className="sidebar-section-heading">
          <span>Recent projects</span>
        </div>
        <label className="history-search">
          <Search size={14} />
          <input
            ref={landing ? undefined : historySearchInputRef}
            type="search"
            placeholder="Find a project..."
            value={historySearch}
            onChange={(event) => setHistorySearch(event.target.value)}
          />
          <span>/</span>
        </label>
      </div>
      <div className="conversation-list">
        {Object.entries(groupedConversations).map(([group, entries]) => (
          <div className="conversation-group" key={group}>
            <div className="group-label">{group}</div>
            {entries.map((conversation) => (
              <button
                className={`conversation-item ${conversation.id === activeId ? "selected" : ""}`}
                key={conversation.id}
                onClick={() => {
                  setActiveId(conversation.id);
                  if (landing) {
                    setView("workspace");
                    setLandingSidebarOpen(false);
                  }
                  if (isCompactLayout) setSidebarOpen(false);
                }}
              >
                <MessageSquare size={14} />
                <span>{conversation.title}</span>
              </button>
            ))}
          </div>
        ))}
        {filteredConversations.length === 0 && (
          <div className="no-results">
            {historySearch ? (
              <>
                <span>No projects match “{historySearch}”.</span>
                <button onClick={() => setHistorySearch("")}>Clear search</button>
              </>
            ) : projectSyncStatus === "loading" ? (
              "Loading your projects…"
            ) : (
              "Your projects will appear here."
            )}
          </div>
        )}
      </div>

      <div className="sidebar-bottom">
        {!user && (
          <button
            className="profile-link"
            onClick={() => {
              setAuthMode("signup");
              setAuthMessage("");
              setIsAuthOpen(true);
            }}
          >
            <span className="avatar guest-avatar">M</span>
            <span><strong>Your account</strong><small>Create your free account</small></span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </aside>
  );
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(selectedFile?.content ?? "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error("Could not copy the preview code:", error);
    }
  };

  return (
    <main className="app-shell">
      {view === "landing" && (
        <section className="landing-page">
          <header className="landing-header">
            {user && (
              <button
                className="icon-button sidebar-toggle landing-sidebar-toggle"
                aria-label={landingSidebarOpen ? "Close projects navigation" : "Open projects navigation"}
                aria-expanded={landingSidebarOpen}
                aria-controls="landing-projects-navigation"
                onClick={() => setLandingSidebarOpen((open) => !open)}
              >
                {landingSidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
              </button>
            )}
            <a className="brand-lockup" href="/" aria-label="Hamshake home">
              <span className="brand-mark"><span /></span>
              <span className="brand-name">Hamshake</span>
            </a>
            <div className="landing-header-actions">
              {!user && (
                <button
                  className="landing-signin"
                  onClick={() => {
                    setAuthMode("signin");
                    setAuthMessage("");
                    setIsAuthOpen(true);
                  }}
                >
                  Sign in
                </button>
              )}
            </div>
          </header>
          {user && landingSidebarOpen && (
            <>
              {renderProjectsNavigation(true)}
              <button
                className="landing-sidebar-scrim"
                aria-label="Close projects navigation"
                onClick={() => setLandingSidebarOpen(false)}
              />
            </>
          )}

          <div className="landing-hero">
            <div className="landing-copy">
              <h1>Dream it.<br /><span>Build it</span> together.</h1>

              <div className="landing-chat-card">
                <textarea
                  ref={landingPromptRef}
                  value={landingPrompt}
                  onChange={(event) => setLandingPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      startProjectFromLanding();
                    }
                  }}
                  placeholder={user ? "Describe the website or app you want to make..." : "Describe the website or app you want to make..."}
                  aria-label="Describe your new project"
                  rows={3}
                />
                <div className="landing-chat-footer">
                  <span>
                    {user
                      ? landingPrompt.trim() ? "You can refine it as you go" : "Describe an idea to get started"
                      : "Describe an idea to get started"}
                  </span>
                  <button
                    disabled={!landingPrompt.trim()}
                    title={!landingPrompt.trim() ? "Add an idea to enable building." : undefined}
                    onClick={() => startProjectFromLanding()}
                  >
                    {user ? "Start building" : "Sign in to start"} <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              <div className="landing-suggestions">
                <span>Need a first spark?</span>
                {["A portfolio", "A tiny shop", "A useful dashboard"].map((idea) => (
                  <button key={idea} onClick={() => setLandingPrompt(`Build ${idea.toLowerCase()} for me`)}>
                    {idea}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className={`workspace-shell ${view === "workspace" ? "" : "view-hidden"}`}>
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="icon-button sidebar-toggle"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={sidebarOpen}
            aria-controls="projects-navigation"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
          </button>
          <a className="brand-lockup" href="/" aria-label="Hamshake home">
            <span className="brand-mark"><span /></span>
            <span className="brand-name">Hamshake</span>
          </a>
        </div>
        <div className="topbar-right">
          {user && projectSyncStatus === "error" && (
            <button
              className="sync-retry-button"
              type="button"
              aria-label={`Sync failed: ${projectSyncError}. Retry synchronization.`}
              title={projectSyncError}
              onClick={() => {
                if (historyOwnerId === user.id) {
                  setProjectSaveAttempt((attempt) => attempt + 1);
                } else {
                  setProjectLoadAttempt((attempt) => attempt + 1);
                }
              }}
            >
              Sync failed · Retry
            </button>
          )}
          <span className="topbar-divider hide-small" />
          {user ? (
            <div className="account-chip">
              <span className="avatar">{(user.email?.[0] ?? "M").toUpperCase()}</span>
              <span className="account-email">{user.email}</span>
              <button className="icon-button signout-button" onClick={() => void signOut()} title="Sign out" aria-label="Sign out">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              className="signin-button"
              onClick={() => {
                setAuthMode("signin");
                setAuthMessage("");
                setIsAuthOpen(true);
              }}
            >
              Sign in <ArrowRight size={14} />
            </button>
          )}
        </div>
      </header>

      <div
        ref={studioLayoutRef}
        className={`studio-layout ${sidebarOpen ? "" : "sidebar-collapsed"} ${isResizingPanes ? "panes-resizing" : ""}`}
        style={{ "--chat-pane-width": chatPaneWidth ? `${chatPaneWidth}px` : undefined } as CSSProperties}
      >
        {sidebarOpen && renderProjectsNavigation()}

        {isCompactLayout && sidebarOpen && (
          <button
            className="sidebar-scrim"
            aria-label="Close projects navigation"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <section className="chat-pane" ref={chatPaneRef}>
          <div className="project-titlebar">
            <div className="project-title">
              <div className="project-icon"><WandSparkles size={15} /></div>
              <span>{activeConversation?.title ?? "Choose a project"}</span>
            </div>
          </div>

          <div className="chat-content" ref={chatContentRef} onScroll={handleChatScroll}>
            <div className="project-context">
              <span className="context-icon"><Sparkles size={13} /></span>
              <span>Building something thoughtful, together.</span>
            </div>
            {pendingPlan?.conversationId === activeId && (
              <div className="implementation-plan" role="region" aria-label="Implementation plan">
                <div className="implementation-plan-header">
                  <div>
                    <span className="plan-label">Implementation plan</span>
                    <h2>Review before building</h2>
                  </div>
                  <span className="plan-status"><Check size={12} /> Ready</span>
                </div>
                <div className="implementation-plan-content">
                  {cleanPlanText(pendingPlan.plan).split(/\r?\n/).map((line, index) => {
                    const text = line.trim();
                    if (!text) return <div className="plan-spacer" key={`blank-${index}`} />;
                    const heading = text.match(/^#{1,3}\s+(.+)$/);
                    if (heading) return <h3 key={`heading-${index}`}>{heading[1]}</h3>;
                    const numbered = text.match(/^(\d+)\.\s+(.+)$/);
                    if (numbered) {
                      return (
                        <div className="plan-list-item" key={`number-${index}`}>
                          <span>{numbered[1]}</span>
                          <p>{numbered[2]}</p>
                        </div>
                      );
                    }
                    const bullet = text.match(/^[-*]\s+(.+)$/);
                    if (bullet) {
                      return (
                        <div className="plan-list-item plan-bullet" key={`bullet-${index}`}>
                          <span />
                          <p>{bullet[1]}</p>
                        </div>
                      );
                    }
                    return <p className="plan-paragraph" key={`text-${index}`}>{text}</p>;
                  })}
                </div>
                <div className="implementation-plan-actions">
                  <button
                    className="plan-revise"
                    onClick={() => {
                      setPrompt(`Revise the plan for: ${pendingPlan.request}`);
                      setPendingPlan(null);
                      setPlanningMode(true);
                      window.requestAnimationFrame(() => promptInputRef.current?.focus());
                    }}
                  >
                    Revise plan
                  </button>
                  <button
                    className="plan-approve"
                    onClick={() => {
                      const approved = pendingPlan;
                      setPendingPlan(null);
                      void sendMessage(
                        `Implement the approved plan exactly:\n\n${approved.plan}`,
                        approved.conversationId,
                        "build"
                      );
                    }}
                    disabled={isSending}
                  >
                    {isSending ? <LoaderCircle size={14} className="spin" /> : <Check size={14} />}
                    Approve & build
                  </button>
                </div>
              </div>
            )}
            {messages.length === 0 && (
              <div className="empty-chat">
                <div className="empty-icon"><WandSparkles size={20} /></div>
                <h1>Every good thing starts somewhere.</h1>
                <div className="starter-prompts">
                  {[
                    "A portfolio for a creative studio",
                    "A simple dashboard for my side project",
                    "A landing page for a new coffee shop"
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setPrompt(suggestion);
                        window.requestAnimationFrame(() => promptInputRef.current?.focus());
                      }}
                    >
                      <Sparkles size={13} /> {suggestion} <ArrowRight size={13} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="message-list">
              {messages.map((message, index) => (
                <article className={`message ${message.role === "user" ? "user-message" : "assistant-message"}`} key={message.id}>
                  {message.role === "assistant" ? (
                    <div className="assistant-avatar"><span className="brand-mark small"><span /></span></div>
                  ) : null}
                  <div className="message-body">
                    <div className="message-meta">
                      <strong>{message.role === "user" ? "You" : "Hamshake"}</strong>
                      <span>{formatTime(message.time)}</span>
                    </div>
                    <p>{message.content}</p>
                    {message.role === "assistant" && index === messages.length - 1 && (
                      <div className="assistant-actions">
                        <button onClick={() => setActiveTab("preview")}><Globe2 size={13} /> View preview <ArrowRight size={12} /></button>
                        <button aria-label="Copy response" title="Copy response" onClick={() => void navigator.clipboard.writeText(message.content)}><Files size={13} /></button>
                        <button
                          aria-label="Ask Hamshake to refine this build"
                          title="Ask Hamshake to refine this build"
                          onClick={() => void sendMessage("Refine the current build while keeping its existing direction.")}
                        >
                          <RefreshCw size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
              {isSending && (
                <div className="thinking-row" role="status" aria-live="polite">
                  <div className="assistant-avatar"><span className="brand-mark small"><span /></span></div>
                  <div className="thinking-bubble"><span /><span /><span /></div>
                  <span>Thinking it through</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {!isChatAtLatest && messages.length > 0 && (
            <button className="scroll-to-latest" onClick={scrollChatToLatest}>
              <ArrowDown size={14} /> Latest message
            </button>
          )}
          <div className="composer-wrap">
            <div className="composer">
              <textarea
                ref={promptInputRef}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={onPromptKeyDown}
                placeholder="Describe a change or tell me what to build…"
                rows={2}
                aria-label="Describe what you want to build"
              />
              <div className="composer-footer">
                <div className="composer-tools">
                  <span className="model-badge"><Sparkles size={13} /> Hamshake AI</span>
                </div>
                <div className="send-controls"><span className="enter-hint">Enter to send · Shift+Enter for a new line</span>
                  <button
                    className={`send-button ${prompt.trim() ? "ready" : ""}`}
                    onClick={() => {
                      const mode = planningMode ? "plan" : "build";
                      setPlanningMode(false);
                      void sendMessage(undefined, undefined, mode);
                    }}
                    disabled={!prompt.trim() || isSending}
                    aria-label="Send message"
                  >
                    {isSending ? <LoaderCircle size={16} className="spin" /> : <ArrowUp size={17} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="composer-note"><LockKeyhole size={10} /> Your ideas are yours. Always.</div>
          </div>
        </section>

        {!isCompactLayout && (
          <div
            className="pane-resizer"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize chat and preview panels"
            aria-valuemin={chatPaneWidthBounds?.minimumChatWidth}
            aria-valuemax={chatPaneWidthBounds?.maximumChatWidth}
            aria-valuenow={Math.round(currentChatPaneWidth)}
            tabIndex={0}
            title="Drag to resize panels; use arrow keys to adjust"
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              setIsResizingPanes(true);
              resizeChatPane(event.clientX);
            }}
            onPointerMove={(event) => {
              if (isResizingPanes) resizeChatPane(event.clientX);
            }}
            onPointerUp={() => setIsResizingPanes(false)}
            onPointerCancel={() => setIsResizingPanes(false)}
            onKeyDown={(event) => {
              const step = event.shiftKey ? 48 : 16;
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                resizeChatPane(
                  (chatPaneRef.current?.getBoundingClientRect().left ?? 0) +
                  currentChatPaneWidth -
                  step
                );
              } else if (event.key === "ArrowRight") {
                event.preventDefault();
                resizeChatPane(
                  (chatPaneRef.current?.getBoundingClientRect().left ?? 0) +
                  currentChatPaneWidth +
                  step
                );
              } else if (event.key === "Home" && chatPaneWidthBounds) {
                event.preventDefault();
                setChatPaneWidth(chatPaneWidthBounds.minimumChatWidth);
              } else if (event.key === "End" && chatPaneWidthBounds) {
                event.preventDefault();
                setChatPaneWidth(chatPaneWidthBounds.maximumChatWidth);
              }
            }}
          >
            <span />
          </div>
        )}

        <section className="workbench">
          <div className="workbench-top">
            <div className="workbench-tabs" role="tablist" aria-label="Workspace views">
              <button
                role="tab"
                aria-selected={activeTab === "preview"}
                className={`workbench-tab ${activeTab === "preview" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("preview")}
              ><Globe2 size={14} /> Preview</button>
              <button
                role="tab"
                aria-selected={activeTab === "code"}
                disabled={projectFiles.length === 0}
                title={!projectFiles.length ? "Build a project to browse its source files." : undefined}
                className={`workbench-tab ${activeTab === "code" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("code")}
              ><Code2 size={14} /> Code</button>
            </div>
            <div className="workbench-actions">
              <button
                className="icon-button refresh-preview"
                aria-label="Refresh preview"
                disabled={!activeConversation?.html}
                onClick={() => setPreviewVersion((version) => version + 1)}
              >
                <RefreshCw size={15} />
              </button>
              <button
                className="publish-button"
                disabled
                aria-label="Publish (not available yet)"
                title="Publishing is not configured for this workspace."
              >
                Publish
              </button>
            </div>
          </div>

          {activeTab === "preview" ? (
            <div className="preview-stage">
              <div className="preview-toolbar">
                <div className="viewport-controls">
                  <button className={previewWidth === "desktop" ? "viewport-active" : ""} onClick={() => setPreviewWidth("desktop")} aria-label="Desktop preview" aria-pressed={previewWidth === "desktop"}><LayoutPanelLeft size={14} /></button>
                  <button className={previewWidth === "mobile" ? "viewport-active" : ""} onClick={() => setPreviewWidth("mobile")} aria-label="Mobile preview" aria-pressed={previewWidth === "mobile"}><Smartphone size={13} /></button>
                </div>
              </div>
              <div className="preview-canvas">
                <div className={`preview-device ${previewWidth === "mobile" ? "mobile-device" : ""}`}>
                  {!activeConversation?.html ? (
                    <div className="preview-empty">
                      <Sparkles size={17} />
                      <span>{isSending ? "Creating your first build…" : "Your preview will appear here."}</span>
                    </div>
                  ) : (
                    <div className="static-preview-shell" key={previewVersion}>
                      <div className="static-preview-notice" role="status">
                        HTML snapshot preview <span>Next.js server routes, actions, and backend integrations aren’t running here.</span>
                      </div>
                      <iframe
                        title="HTML snapshot preview"
                        srcDoc={keepPreviewNavigationLocal(previewCode)}
                        sandbox="allow-scripts allow-forms"
                        className="preview-frame"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="code-panel">
              <div className="code-toolbar">
                <div><FileCode2 size={14} /><span>{selectedFile?.path ?? "app/page.tsx"}</span><span className="code-dot" /></div>
                <button className="copy-code" onClick={() => void copyCode()}>{copied ? <Check size={13} /> : <Files size={13} />}{copied ? "Copied" : "Copy code"}</button>
              </div>
              <div className="source-browser">
                <nav className="file-list" aria-label="Project files">
                  <div className="file-list-heading">PROJECT FILES</div>
                  {projectFiles.map((file) => (
                    <button
                      key={file.path}
                      className={`file-item ${file.path === selectedFile?.path ? "file-item-active" : ""}`}
                      onClick={() => setSelectedFilePath(file.path)}
                      title={file.path}
                    >
                      <FileCode2 size={13} />
                      <span>{file.path}</span>
                    </button>
                  ))}
                </nav>
                <pre><code>{selectedFile?.content ?? "Send a prompt to generate your app files."}</code></pre>
              </div>
              <div className="code-note"><span className="code-note-dot" /> Next.js <span>·</span> React <span>·</span> TypeScript <span>·</span> Tailwind CSS <span>·</span> SQL</div>
            </div>
          )}
          <div className="workbench-footer">
            <span>
              <span className="live-dot" />
              {activeConversation?.html ? "HTML snapshot ready" : isSending ? "Preparing preview…" : "Waiting for your first build"}
            </span>
            <span><Clock3 size={12} />{activeConversation?.updatedAt ? `Updated ${formatTime(activeConversation.updatedAt)}` : "No build yet"}</span>
            <span className="footer-spacer" />
          </div>
        </section>
      </div>
      </div>

      {isAuthOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsAuthOpen(false);
        }}>
          <section className="auth-modal" aria-labelledby="auth-title" role="dialog" aria-modal="true">
            <button className="auth-close icon-button" onClick={() => setIsAuthOpen(false)} aria-label="Close"><X size={17} /></button>
            <div className="auth-mark"><span className="brand-mark"><span /></span></div>
            <div className="auth-eyebrow">{authMode === "signin" ? "Welcome back" : "A lovely place to start"}</div>
            <h2 id="auth-title">{authMode === "signin" ? "Pick up where you left off." : "Make room for your ideas."}</h2>
            <p className="auth-description">Sign in to keep your projects and creative momentum together.</p>
            <form onSubmit={handleAuth}>
              <label>Email address<input type="email" autoComplete="email" required placeholder="you@example.com" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} /></label>
              <label htmlFor="auth-password">Password</label>
              <div className="password-field">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                  minLength={authMode === "signup" ? 12 : undefined}
                  required
                  placeholder={authMode === "signup" ? "At least 12 characters" : "Your password"}
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                />
                <button
                  className="password-visibility"
                  type="button"
                  aria-controls="auth-password"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {authMessage && <p className="auth-message" role="status">{authMessage}</p>}
              <button type="submit" className="auth-submit" disabled={authBusy}>
                {authBusy ? <LoaderCircle size={16} className="spin" /> : null}
                {authMode === "signin" ? "Sign in" : "Create your account"} <ArrowRight size={15} />
              </button>
            </form>
            <div className="auth-switch">
              {authMode === "signin" ? "New around here?" : "Already have an account?"}
              <button onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setAuthMessage(""); }}>
                {authMode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </div>
            <div className="auth-footnote"><LockKeyhole size={11} /> Your account is stored securely in Cloudflare. Email verification and password recovery are not available yet.</div>
          </section>
        </div>
      )}
    </main>
  );
}
