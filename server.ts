import { Elysia, t } from "elysia";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { insertScene, getScenesBySession, getSceneById } from "./db";
import { join } from "path";
import { readFileSync, existsSync, statSync } from "fs";

const PORT = Number(process.env.PORT) || 8080;
const BUCKET = process.env.S3_BUCKET || "tresde-scenes";
const REGION = process.env.AWS_REGION || "us-east-1";

const s3 = new S3Client({ region: REGION });

const DIST_DIR = join(import.meta.dir, "dist");

function generateId(): string {
  return crypto.randomUUID().slice(0, 8);
}

const app = new Elysia()
  // Session cookie middleware
  .derive(({ cookie }) => {
    let sessionId = cookie.tresde_session?.value;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      cookie.tresde_session.set({
        value: sessionId,
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 365 * 2, // 2 years
        sameSite: "lax",
      });
    }
    return { sessionId };
  })

  // Publish scene
  .post(
    "/api/publish",
    async ({ body, sessionId }) => {
      const { html, sceneData, title } = body;
      const id = generateId();
      const key = `scenes/${id}.html`;

      // Inject "Editar copia" button into the shared HTML
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

      return { url: s3Url, id };
    },
    {
      body: t.Object({
        html: t.String(),
        sceneData: t.Any(),
        title: t.Optional(t.String()),
      }),
    }
  )

  // List scenes for current session
  .get("/api/scenes", ({ sessionId }) => {
    const scenes = getScenesBySession(sessionId);
    return scenes.map((s) => ({
      id: s.id,
      title: s.title,
      url: s.s3_url,
      createdAt: s.created_at,
    }));
  })

  // Get scene data for import
  .get("/api/scenes/:id/data", ({ params }) => {
    const scene = getSceneById(params.id);
    if (!scene) return new Response("Not found", { status: 404 });
    return JSON.parse(scene.scene_data);
  })

  // Static file serving (SPA fallback)
  .get("/*", ({ path }) => {
    // Try exact file
    let filePath = join(DIST_DIR, path);
    if (existsSync(filePath) && statSync(filePath).isFile()) {
      return new Response(Bun.file(filePath));
    }
    // SPA fallback
    return new Response(Bun.file(join(DIST_DIR, "index.html")));
  })

  .listen(PORT);

console.log(`tresde server running on :${PORT}`);
