/**
 * Reads a fetch Response body as text once, then parses JSON.
 * Use instead of branching on Content-Type — CDNs and proxies sometimes omit or vary the header.
 */
export async function readJsonResponseBody(res: Response): Promise<Record<string, unknown>> {
  let raw = '';
  try {
    raw = await res.text();
  } catch {
    return {};
  }
  const t = raw.trim();
  if (!t) return {};
  try {
    return JSON.parse(t) as Record<string, unknown>;
  } catch {
    return {};
  }
}
