declare module "cloudflare:workers" {
  interface ContainerProcessResult {
    stdout: ArrayBuffer;
    stderr: ArrayBuffer;
    exitCode: number;
  }

  interface ContainerProcess {
    pid: number;
    output(): Promise<ContainerProcessResult>;
    exitCode: Promise<number>;
  }

  interface ContainerRuntime {
    readonly running: boolean;
    readonly images: { base: object };
    start(options: { image: object; instance: "standard-1"; enableInternet: boolean }): void;
    destroy(): Promise<void>;
    setInactivityTimeout(milliseconds: number): Promise<void>;
    interceptOutboundHttps(host: string, handler: { fetch(request: Request): Promise<Response> | Response }): Promise<void>;
    exec(
      command: string[],
      options?: {
        cwd?: string;
        env?: Record<string, string>;
        stdin?: ReadableStream<Uint8Array>;
        stdout?: "ignore";
      }
    ): Promise<ContainerProcess>;
    getTcpPort(port: number): { fetch(request: Request | string, init?: RequestInit): Promise<Response> };
  }

  interface DurableObjectContext {
    readonly container?: ContainerRuntime;
    readonly exports: {
      NpmRegistry: { fetch(request: Request): Promise<Response> | Response };
      DenyOutbound: { fetch(request: Request): Promise<Response> | Response };
    };
    readonly storage: {
      get<T>(key: string): Promise<T | undefined>;
      put<T>(key: string, value: T): Promise<void>;
    };
  }

  export class DurableObject<Env = unknown> {
    protected readonly ctx: DurableObjectContext;
    protected readonly env: Env;
    constructor(ctx: DurableObjectContext, env: Env);
  }

  export class WorkerEntrypoint<Env = unknown> {
    protected readonly env: Env;
    constructor(ctx: unknown, env: Env);
  }
}

interface Headers {
  getSetCookie(): string[];
}
