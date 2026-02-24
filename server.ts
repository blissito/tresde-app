import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { insertScene, updateScene, getSceneBySession, getScenesBySession, getSceneById, toSlug, insertWaitlist, isSessionRegistered, getAllWaitlist, getAllScenes, deleteScene } from "./db";
import { join } from "path";

const PORT = Number(process.env.PORT) || 8080;
const BUCKET = process.env.S3_BUCKET || "tresde-scenes";
const REGION = process.env.AWS_REGION || "us-east-1";

const s3 = new S3Client({ region: REGION });
const DIST_DIR = join(import.meta.dir, "dist");

function generateId(): string {
  return crypto.randomUUID().slice(0, 8);
}

function getSessionId(req: Request): { sessionId: string; isNew: boolean } {
  const cookies = req.headers.get("cookie") || "";
  const match = cookies.match(/tresde_session=([^;]+)/);
  if (match) return { sessionId: match[1], isNew: false };
  return { sessionId: crypto.randomUUID(), isNew: true };
}

function withSession(res: Response, sessionId: string, isNew: boolean): Response {
  if (isNew) {
    res.headers.set(
      "Set-Cookie",
      `tresde_session=${sessionId}; HttpOnly; Path=/; Max-Age=63072000; SameSite=Lax`
    );
  }
  return res;
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const { sessionId, isNew } = getSessionId(req);

    // POST /api/publish
    if (url.pathname === "/api/publish" && req.method === "POST") {
      const { html, sceneData, title, sceneId } = await req.json();

      // Use client-provided sceneId to update, otherwise create new
      const existing = sceneId ? getSceneById(sceneId) : null;
      const slug = existing?.id || toSlug(title || "escena") + "-" + generateId();
      const key = `scenes/${slug}.html`;

      const editButton = `<a href="https://tresde-app.fly.dev/?import=${slug}" target="_blank" style="position:fixed;bottom:12px;left:12px;background:rgba(139,92,246,0.9);color:#fff;padding:6px 14px;border-radius:8px;font:500 13px/1 system-ui,sans-serif;text-decoration:none;z-index:9999;backdrop-filter:blur(4px)">Editar copia</a>`;
      const finalHtml = html.replace("</body>", `${editButton}\n</body>`);

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: finalHtml,
          ContentType: "text/html",
          CacheControl: "no-store, must-revalidate",
        })
      );

      const s3Url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

      if (existing) {
        updateScene(existing.id, title || null, s3Url, JSON.stringify(sceneData));
      } else {
        insertScene(slug, sessionId, title || null, s3Url, JSON.stringify(sceneData));
      }

      return withSession(
        Response.json({ url: s3Url, id: slug }),
        sessionId,
        isNew
      );
    }

    // GET /api/scenes
    if (url.pathname === "/api/scenes" && req.method === "GET") {
      const scenes = getScenesBySession(sessionId);
      return withSession(
        Response.json(
          scenes.map((s) => ({
            id: s.id,
            title: s.title,
            url: s.s3_url,
            createdAt: s.created_at,
          }))
        ),
        sessionId,
        isNew
      );
    }

    // POST /api/waitlist
    if (url.pathname === "/api/waitlist" && req.method === "POST") {
      try {
        const { email } = await req.json();
        if (!email || typeof email !== "string" || !email.includes("@")) {
          return withSession(Response.json({ ok: false, error: "Email inválido" }, { status: 400 }), sessionId, isNew);
        }
        insertWaitlist(email.trim().toLowerCase(), sessionId);
        return withSession(Response.json({ ok: true }), sessionId, isNew);
      } catch {
        return withSession(Response.json({ ok: false, error: "Error" }, { status: 500 }), sessionId, isNew);
      }
    }

    // GET /api/waitlist/status
    if (url.pathname === "/api/waitlist/status" && req.method === "GET") {
      const registered = isSessionRegistered(sessionId);
      return withSession(Response.json({ registered }), sessionId, isNew);
    }

    // DELETE /api/admin/scenes/:id
    const deleteMatch = url.pathname.match(/^\/api\/admin\/scenes\/([^/]+)$/);
    if (deleteMatch && req.method === "DELETE") {
      if (url.searchParams.get("key") !== process.env.ADMIN_KEY) {
        return new Response("No autorizado", { status: 401 });
      }
      const scene = getSceneById(deleteMatch[1]);
      if (scene) {
        try {
          const s3Key = new URL(scene.s3_url).pathname.slice(1);
          await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: s3Key, Body: "", ContentType: "text/html" }));
        } catch {}
        deleteScene(scene.id);
      }
      return Response.json({ ok: true });
    }

    // GET /admin/
    if (url.pathname === "/admin" || url.pathname === "/admin/") {
      if (url.searchParams.get("key") !== process.env.ADMIN_KEY) {
        return new Response("No autorizado", { status: 401 });
      }
      const rows = getAllWaitlist();
      const scenes = getAllScenes();
      const waitlistRows = rows.map((r, i) => `
        <tr class="${i % 2 === 0 ? 'bg-zinc-900/50' : ''}">
          <td class="px-4 py-3 text-zinc-400 text-sm">${r.id}</td>
          <td class="px-4 py-3 text-white">${r.email}</td>
          <td class="px-4 py-3 text-zinc-500 text-sm font-mono">${r.session_id?.slice(0, 8) || '—'}…</td>
          <td class="px-4 py-3 text-zinc-400 text-sm">${new Date(r.created_at + 'Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
        </tr>`).join('');

      const sceneRows = scenes.map((s, i) => `
        <tr class="${i % 2 === 0 ? 'bg-zinc-900/50' : ''}">
          <td class="px-4 py-3 text-white">${s.title || s.id}</td>
          <td class="px-4 py-3 text-sm">${s.email ? `<span class="text-emerald-400">${s.email}</span>` : `<span class="text-zinc-600 font-mono">${s.session_id?.slice(0, 8)}…</span>`}</td>
          <td class="px-4 py-3 text-sm flex items-center gap-2">
            <a href="${s.s3_url}" target="_blank" class="text-violet-400 hover:text-violet-300">Ver live</a>
            <span class="text-zinc-700">·</span>
            <a href="/?import=${s.id}" target="_blank" class="text-emerald-400 hover:text-emerald-300">Editor</a>
            <span class="text-zinc-700">·</span>
            <button onclick="if(confirm('Borrar ${s.title || s.id}?')){fetch('/api/admin/scenes/${s.id}?key='+new URLSearchParams(location.search).get('key'),{method:'DELETE'}).then(()=>location.reload())}" class="text-red-400 hover:text-red-300">Borrar</button>
          </td>
          <td class="px-4 py-3 text-zinc-400 text-sm">${new Date(s.updated_at + 'Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
        </tr>`).join('');

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Admin — tresde.app</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>tailwind.config={theme:{extend:{colors:{zinc:{950:'#09090b'}}}}}</script>
</head>
<body class="bg-zinc-950 text-white min-h-screen p-8">
  <div class="max-w-4xl mx-auto">
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-2xl font-bold">Admin</h1>
      <a href="/" class="text-violet-400 hover:text-violet-300 text-sm">← Editor</a>
    </div>

    <h2 class="text-lg font-semibold mb-2">Lista de espera <span class="text-zinc-500 text-sm font-normal">(${rows.length})</span></h2>
    ${rows.length === 0
      ? '<p class="text-zinc-500 text-center py-8">Aún no hay registros</p>'
      : `<div class="border border-zinc-800 rounded-xl overflow-hidden mb-10">
      <table class="w-full text-left">
        <thead>
          <tr class="border-b border-zinc-800 bg-zinc-900">
            <th class="px-4 py-3 text-zinc-400 text-xs font-medium uppercase tracking-wider">#</th>
            <th class="px-4 py-3 text-zinc-400 text-xs font-medium uppercase tracking-wider">Email</th>
            <th class="px-4 py-3 text-zinc-400 text-xs font-medium uppercase tracking-wider">Sesión</th>
            <th class="px-4 py-3 text-zinc-400 text-xs font-medium uppercase tracking-wider">Fecha</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-800/50">${waitlistRows}</tbody>
      </table>
    </div>`}

    <h2 class="text-lg font-semibold mb-2">Escenas publicadas <span class="text-zinc-500 text-sm font-normal">(${scenes.length})</span></h2>
    ${scenes.length === 0
      ? '<p class="text-zinc-500 text-center py-8">Sin escenas</p>'
      : `<div class="border border-zinc-800 rounded-xl overflow-hidden">
      <table class="w-full text-left">
        <thead>
          <tr class="border-b border-zinc-800 bg-zinc-900">
            <th class="px-4 py-3 text-zinc-400 text-xs font-medium uppercase tracking-wider">Título</th>
            <th class="px-4 py-3 text-zinc-400 text-xs font-medium uppercase tracking-wider">Usuario</th>
            <th class="px-4 py-3 text-zinc-400 text-xs font-medium uppercase tracking-wider">Links</th>
            <th class="px-4 py-3 text-zinc-400 text-xs font-medium uppercase tracking-wider">Actualizado</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-800/50">${sceneRows}</tbody>
      </table>
    </div>`}
  </div>
</body>
</html>`;
      return withSession(new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } }), sessionId, isNew);
    }

    // GET /api/scenes/:id/data
    const dataMatch = url.pathname.match(/^\/api\/scenes\/([^/]+)\/data$/);
    if (dataMatch && req.method === "GET") {
      const scene = getSceneById(dataMatch[1]);
      if (!scene) return new Response("Not found", { status: 404 });
      return Response.json(JSON.parse(scene.scene_data));
    }

    // Static files
    const filePath = join(DIST_DIR, url.pathname);
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }

    // SPA fallback
    return new Response(Bun.file(join(DIST_DIR, "index.html")));
  },
});

console.log(`tresde server running on :${PORT}`);
