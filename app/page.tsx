"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Code2,
  Command,
  FileCode2,
  Files,
  FolderPlus,
  Globe2,
  History,
  LayoutPanelLeft,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  Smartphone,
  Settings2,
  Sparkles,
  WandSparkles,
  X,
  Zap
} from "lucide-react";
import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

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
    "start": "next start"
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
    "@types/node": "^22.15.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "typescript": "^5.8.3"
  }
}`
  },
  {
    path: "next.config.ts",
    content: `import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

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
    path: "supabase/schema.sql",
    content: `-- Add Supabase/PostgreSQL tables here when this project needs persistent data.
-- Enable row-level security and scope policies to auth.uid() for user-owned records.`
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
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState(initialConversations[0].id);
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
  const [user, setUser] = useState<User | null>(null);
  const [authConfigured, setAuthConfigured] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [historySearch, setHistorySearch] = useState("");
  const [previewWidth, setPreviewWidth] = useState<"desktop" | "mobile">("desktop");
  const [previewVersion, setPreviewVersion] = useState(0);
  const [copied, setCopied] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [previewCode, setPreviewCode] = useState(previewMarkup);
  const [selectedFilePath, setSelectedFilePath] = useState("app/page.tsx");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const landingPromptRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = conversations.find((item) => item.id === activeId);
  const messages = activeConversation?.messages ?? starterMessages;
  const projectFiles = activeConversation?.files ?? starterProjectFiles;
  const selectedFile = projectFiles.find((file) => file.path === selectedFilePath) ?? projectFiles[0];

  useEffect(() => {
    const supabase = getSupabaseClient();
    setAuthConfigured(Boolean(supabase));
    if (!supabase) return;

    supabase.auth.getUser().then(({ data, error }) => {
      if (error && error.name !== "AuthSessionMissingError") {
        console.error("Could not read the current Supabase session:", error.message);
      }
      setUser(data.user);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("morrow-conversations");
      if (saved) {
        const parsed = JSON.parse(saved) as Conversation[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConversations(parsed);
          setActiveId(parsed[0].id);
        }
      }
    } catch (error) {
      console.error("Could not restore saved conversations:", error);
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!historyLoaded) return;
    try {
      window.localStorage.setItem("morrow-conversations", JSON.stringify(conversations));
    } catch (error) {
      console.error("Could not save conversation history:", error);
    }
  }, [conversations, historyLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  useEffect(() => {
    setPreviewCode(activeConversation?.html ?? previewMarkup);
    setSelectedFilePath(activeConversation?.files?.[0]?.path ?? starterProjectFiles[2].path);
  }, [activeId, activeConversation?.html, activeConversation?.files]);

  const openLandingChat = useCallback(() => {
    setLandingPrompt("");
    setView("landing");
    window.requestAnimationFrame(() => {
      landingPromptRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      landingPromptRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    const handleNewProjectShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openLandingChat();
      }
    };

    window.addEventListener("keydown", handleNewProjectShortcut);
    return () => window.removeEventListener("keydown", handleNewProjectShortcut);
  }, [openLandingChat]);

  useEffect(() => {
    if (view === "landing") {
      window.requestAnimationFrame(() => landingPromptRef.current?.focus());
    }
  }, [view]);

  const createConversation = useCallback(() => {
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      title: "Untitled project",
      updatedAt: now(),
      messages: [...starterMessages],
      files: starterProjectFiles
    };
    setConversations((existing) => [conversation, ...existing]);
    setActiveId(conversation.id);
    setActiveTab("preview");
    setView("workspace");
    setPrompt("");
    return conversation.id;
  }, []);

  const sendMessage = async (messageText?: string, targetConversationId?: string) => {
    const text = (messageText ?? prompt).trim();
    if (!text || isSending) return;

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
        files: starterProjectFiles
      };
      setConversations((existing) => [fresh, ...existing]);
      setActiveId(conversationId);
    }

    const currentFiles = targetConversation?.files ?? (targetConversationId ? starterProjectFiles : projectFiles);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: currentFiles,
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
        error?: string;
      };
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
        `${detail} You can still explore the sample project in Preview, or configure the AI settings in the project environment.`
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
    const conversationId = createConversation();
    setLandingPrompt("");
    if (idea.trim()) {
      void sendMessage(idea, conversationId);
    }
  };

  const onPromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthMessage("");
    const supabase = getSupabaseClient();
    if (!supabase) {
      setAuthMessage("Add your Supabase URL and anon key to .env.local to enable authentication.");
      return;
    }

    setAuthBusy(true);
    try {
      const result =
        authMode === "signin"
          ? await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
          : await supabase.auth.signUp({ email: authEmail, password: authPassword });
      if (result.error) {
        setAuthMessage(result.error.message);
      } else if (authMode === "signup" && !result.data.session) {
        setAuthMessage("Check your inbox to confirm your email and finish creating your account.");
      } else {
        setIsAuthOpen(false);
        setAuthPassword("");
        setAuthMessage("");
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Authentication failed. Please try again.");
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Could not sign out:", error.message);
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
            <a className="brand-lockup" href="/" aria-label="Morrow home">
              <span className="brand-mark"><span /></span>
              <span className="brand-name">morrow</span>
            </a>
            <div className="landing-header-actions">
              <span className="landing-header-note">A little space to make something real.</span>
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
              <button className="landing-header-cta" onClick={openLandingChat}>
                New project <ArrowRight size={14} />
              </button>
            </div>
          </header>

          <div className="landing-hero">
            <div className="landing-copy">
              <div className="landing-eyebrow"><span /> YOUR NEXT IDEA STARTS HERE</div>
              <h1>Dream it.<br /><span>Build it</span> together.</h1>
              <p className="landing-description">
                A thought, a few words, a whole new website. Tell Morrow what you have in mind and build it one conversation at a time.
              </p>

              <div className="landing-chat-card">
                <div className="landing-chat-label">
                  <span><MessageSquare size={14} /> A fresh project, in your words</span>
                  <span>CHAT</span>
                </div>
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
                  placeholder="I want to make a site for..."
                  aria-label="Describe your new project"
                  rows={3}
                />
                <div className="landing-chat-footer">
                  <span><Sparkles size={12} /> Your idea can change as you go</span>
                  <button onClick={() => startProjectFromLanding()}>
                    Start building <ArrowRight size={14} />
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

            <div className="landing-visual" aria-hidden="true">
              <div className="landing-orbit orbit-one" />
              <div className="landing-orbit orbit-two" />
              <div className="landing-artifact artifact-top"><Sparkles size={13} /><span>Made together</span></div>
              <div className="landing-preview-card">
                <div className="landing-browser-bar">
                  <span /><span /><span />
                  <div>Live preview</div>
                </div>
                <div className="landing-preview-page">
                  <div className="landing-preview-nav"><span>goodthings.</span><span>WORK&nbsp;&nbsp;&nbsp; ABOUT&nbsp;&nbsp;&nbsp; CONTACT</span></div>
                  <div className="landing-preview-body">
                    <span className="landing-preview-kicker">A THOUGHTFUL LITTLE STUDIO</span>
                    <strong>Good things<br />start somewhere.</strong>
                    <span className="landing-preview-link">Come on in <ArrowRight size={12} /></span>
                    <div className="landing-preview-art">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              </div>
              <div className="landing-artifact artifact-bottom"><span className="landing-artifact-dot" /> Live preview <span>·</span> Yours to shape</div>
            </div>
          </div>

          <footer className="landing-footer">
            <div className="landing-footer-promise"><span>01</span> Start with a conversation</div>
            <div className="landing-footer-promise"><span>02</span> Make it yours, as you go</div>
            <div className="landing-footer-promise"><span>03</span> See it come to life</div>
            <div className="landing-stack">Next.js <span>·</span> React <span>·</span> TypeScript <span>·</span> Tailwind</div>
          </footer>
        </section>
      )}

      <div className={`workspace-shell ${view === "workspace" ? "" : "view-hidden"}`}>
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="icon-button sidebar-toggle"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
          </button>
          <a className="brand-lockup" href="/" aria-label="Morrow home">
            <span className="brand-mark"><span /></span>
            <span className="brand-name">morrow</span>
          </a>
        </div>
        <div className="topbar-right">
          <span className="save-status"><span /> All changes saved</span>
          <span className="topbar-divider hide-small" />
          <button className="help-button" aria-label="Help"><CircleHelp size={16} /></button>
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

      <div className={`studio-layout ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
        {sidebarOpen && (
          <aside className="sidebar">
            <button
              className="new-project-button"
              onClick={openLandingChat}
            >
              <Plus size={16} strokeWidth={2.2} /> New project
              <span className="shortcut"><Command size={10} /> K</span>
            </button>

            <div className="sidebar-section-heading">
              <span>Your space</span><MoreHorizontal size={17} />
            </div>
            <button className="sidebar-link active-link"><LayoutPanelLeft size={15} /> My projects</button>
            <button className="sidebar-link"><Files size={15} /> Templates <span className="link-count">12</span></button>

            <div className="history-heading">
              <div className="sidebar-section-heading"><span>Recent projects</span><button aria-label="New project" onClick={openLandingChat}><Plus size={15} /></button></div>
              <label className="history-search">
                <Search size={14} />
                <input
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
                      onClick={() => setActiveId(conversation.id)}
                    >
                      <MessageSquare size={14} />
                      <span>{conversation.title}</span>
                      <MoreHorizontal className="conversation-more" size={15} />
                    </button>
                  ))}
                </div>
              ))}
              {filteredConversations.length === 0 && (
                <div className="no-results">No projects found.</div>
              )}
            </div>

            <div className="sidebar-bottom">
              <button className="sidebar-link bottom-link"><Settings2 size={15} /> Settings</button>
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
                  <span><strong>Your account</strong><small>{authConfigured ? "Create your free account" : "Sign-in setup available"}</small></span>
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </aside>
        )}

        <section className="chat-pane">
          <div className="project-titlebar">
            <div className="project-title">
              <div className="project-icon"><WandSparkles size={15} /></div>
              <span>{activeConversation?.title ?? "A landing page for Studio North"}</span>
              <ChevronDown size={14} className="title-chevron" />
            </div>
            <button className="icon-button project-menu" aria-label="Project options"><MoreHorizontal size={18} /></button>
          </div>

          <div className="chat-content">
            <div className="project-context">
              <span className="context-icon"><Sparkles size={13} /></span>
              <span>Building something thoughtful, together.</span>
            </div>
            {messages.length === 0 && (
              <div className="empty-chat">
                <div className="empty-icon"><WandSparkles size={20} /></div>
                <h1>Every good thing starts somewhere.</h1>
                <p>Describe what you’d like to make. Morrow generates a Next.js app with React, TypeScript, Tailwind CSS, SQL, and a live HTML preview.</p>
                <div className="starter-prompts">
                  {[
                    "A portfolio for a creative studio",
                    "A simple dashboard for my side project",
                    "A landing page for a new coffee shop"
                  ].map((suggestion) => (
                    <button key={suggestion} onClick={() => setPrompt(suggestion)}>
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
                      <strong>{message.role === "user" ? "You" : "Morrow"}</strong>
                      <span>{formatTime(message.time)}</span>
                    </div>
                    <p>{message.content}</p>
                    {message.role === "assistant" && index === messages.length - 1 && (
                      <div className="assistant-actions">
                        <button onClick={() => setActiveTab("preview")}><Globe2 size={13} /> View preview <ArrowRight size={12} /></button>
                        <button aria-label="Copy response" onClick={() => void navigator.clipboard.writeText(message.content)}><Files size={13} /></button>
                        <button aria-label="Regenerate response" onClick={() => setPrompt("Can you refine the last response?")}><RefreshCw size={13} /></button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
              {isSending && (
                <div className="thinking-row">
                  <div className="assistant-avatar"><span className="brand-mark small"><span /></span></div>
                  <div className="thinking-bubble"><span /><span /><span /></div>
                  <span>Thinking it through</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="composer-wrap">
            <div className="composer">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={onPromptKeyDown}
                placeholder="Tell me what you're dreaming up..."
                rows={2}
                aria-label="Describe what you want to build"
              />
              <div className="composer-footer">
                <div className="composer-tools">
                  <button className="composer-tool" aria-label="Attach a file"><Paperclip size={15} /><span>Attach</span></button>
                  <span className="composer-separator" />
                  <button className="model-select"><Sparkles size={13} /> Morrow AI <ChevronDown size={12} /></button>
                </div>
                <div className="send-controls"><span className="enter-hint">↵ to send</span>
                  <button
                    className={`send-button ${prompt.trim() ? "ready" : ""}`}
                    onClick={() => void sendMessage()}
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
                className={`workbench-tab ${activeTab === "code" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("code")}
              ><Code2 size={14} /> Code</button>
            </div>
            <div className="workbench-actions">
              <button
                className="icon-button refresh-preview"
                aria-label="Refresh preview"
                onClick={() => setPreviewVersion((version) => version + 1)}
              >
                <RefreshCw size={15} />
              </button>
              <button className="publish-button"><Zap size={13} /> Publish</button>
            </div>
          </div>

          {activeTab === "preview" ? (
            <div className="preview-stage">
              <div className="preview-toolbar">
                <div className="viewport-controls">
                  <button className={previewWidth === "desktop" ? "viewport-active" : ""} onClick={() => setPreviewWidth("desktop")} aria-label="Desktop preview"><LayoutPanelLeft size={14} /></button>
                  <button className={previewWidth === "mobile" ? "viewport-active" : ""} onClick={() => setPreviewWidth("mobile")} aria-label="Mobile preview"><Smartphone size={13} /></button>
                </div>
              </div>
              <div className="preview-canvas">
                <div className={`preview-device ${previewWidth === "mobile" ? "mobile-device" : ""}`}>
                  <iframe
                    key={previewVersion}
                    title="Live site preview"
                    srcDoc={previewCode}
                    sandbox="allow-scripts"
                    className="preview-frame"
                  />
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
            <span><span className="live-dot" /> Preview is live</span>
            <span><Clock3 size={12} /> Updated just now</span>
            <span className="footer-spacer" />
            <button aria-label="Open preview help"><CircleHelp size={13} /></button>
            <button aria-label="Preview options"><MoreHorizontal size={16} /></button>
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
                  minLength={6}
                  required
                  placeholder="At least 6 characters"
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
            <div className="auth-footnote"><LockKeyhole size={11} /> Your account is securely powered by Supabase.</div>
          </section>
        </div>
      )}
    </main>
  );
}
