import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getD1Database(): Promise<HamshakeD1Database> {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.PROJECTS_DB) {
    throw new Error("The PROJECTS_DB Cloudflare D1 binding is not configured.");
  }
  return env.PROJECTS_DB;
}
