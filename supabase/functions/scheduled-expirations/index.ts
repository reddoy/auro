import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Content-Type": "application/json",
  } as Record<string, string>;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders() });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });
  try {
    // Nightly cleanup: delete temp uploads older than TTL
    const ttlHours = Number(Deno.env.get('TEMP_UPLOAD_TTL_HOURS') || '72');
    const bucket = Deno.env.get('REQUEST_MEDIA_BUCKET') || 'request-media';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!supabaseUrl || !serviceKey) return json({ error: 'Missing Supabase credentials' }, 500);

    const since = Date.now() - ttlHours * 60 * 60 * 1000;

    // Use storage list to find temp-uploads and clean nested folders
    const listPrefix = `storage/v1/object/list/${bucket}`;
    const list = async (prefix: string): Promise<any[]> => {
      const resp = await fetch(`${supabaseUrl}/${listPrefix}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix, limit: 1000, sortBy: { column: 'name', order: 'asc' } })
      });
      if (!resp.ok) return [];
      return await resp.json();
    };

    const remove = async (paths: string[]) => {
      if (paths.length === 0) return;
      const resp = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(paths)
      });
      return resp.ok;
    };

    const entries = await list('temp-uploads/');
    const toDelete: string[] = [];
    const walk = async (prefix: string) => {
      const items = await list(prefix);
      for (const it of items) {
        const isFolder = it.id === null && it.name;
        if (isFolder) {
          await walk(`${prefix}${it.name}/`);
        } else {
          const updated = new Date(it.updated_at || it.created_at || Date.now()).getTime();
          if (updated < since) {
            toDelete.push(`${prefix}${it.name}`);
          }
        }
      }
    };
    await walk('temp-uploads/');
    if (toDelete.length > 0) {
      await remove(toDelete);
    }
    return json({ ok: true, deleted: toDelete.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});


