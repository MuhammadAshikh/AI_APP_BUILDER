interface HamshakeD1Statement {
  bind(...values: (string | number | null)[]): HamshakeD1Statement;
  all<T>(): Promise<{ results: T[] }>;
  first<T>(): Promise<T | null>;
}

interface HamshakeD1Database {
  prepare(query: string): HamshakeD1Statement;
  batch(statements: HamshakeD1Statement[]): Promise<unknown[]>;
}

interface CloudflareEnv {
  PROJECTS_DB?: HamshakeD1Database;
}
