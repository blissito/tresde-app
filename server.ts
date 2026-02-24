import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { insertScene, getScenesBySession, getSceneById } from "./db";
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
      const { html, sceneData, title } = await req.json();
      const id = generateId();
      const key = `scenes/${id}.html`;

      const editButton = `<a href="https://tresde-app.fly.dev/?import=${id}" target="_blank" style="position:fixed;bottom:12px;left:12px;background:rgba(139,92,246,0.9);color:#fff;padding:6px 14px;border-radius:8px;font:500 13px/1 system-ui,sans-serif;text-decoration:none;z-index:9999;backdrop-filter:blur(4px)">Editar copia</a>`;
      const finalHtml = html.replace("</body>", `${editButton}\n</body>`);

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: finalHtml,
          ContentType: "text/html",
          CacheControl: "public, max-age=31536000, immutable",
        })
      );

      const s3Url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
      insertScene(id, sessionId, title || null, s3Url, JSON.stringify(sceneData));

      return withSession(
        Response.json({ url: s3Url, id }),
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
