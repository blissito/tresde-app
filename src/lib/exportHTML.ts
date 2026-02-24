import type { SceneObject, Slide } from "../store/scene";
import embedTemplate from "../../dist-embed/embed.html?raw";

interface ExportState {
  objects: SceneObject[];
  environment: string;
  bgColor: string;
  slides: Slide[];
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
}

async function assetToDataURI(url: string, mimeType: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Replace the auto-detected mime with the specified one
        const result = reader.result as string;
        const dataUri = result.replace(/^data:[^;]+/, `data:${mimeType}`);
        resolve(dataUri);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function textureToDataURI(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateHTML(state: ExportState): Promise<string> {
  // Convert texture URLs and GLB URLs to data URIs
  const objects = await Promise.all(
    state.objects.map(async (obj) => {
      const updates: Partial<SceneObject> = {};
      if (obj.textureUrl) {
        const dataURI = await textureToDataURI(obj.textureUrl);
        if (dataURI) updates.textureUrl = dataURI;
        else updates.textureUrl = undefined;
      }
      if (obj.glbUrl) {
        const isObj = obj.glbUrl.toLowerCase().endsWith(".obj");
        const mime = isObj ? "text/plain" : "model/gltf-binary";
        const dataURI = await assetToDataURI(obj.glbUrl, mime);
        if (dataURI) updates.glbUrl = dataURI;
      }
      return Object.keys(updates).length > 0 ? { ...obj, ...updates } : obj;
    })
  );

  // Fetch font data to embed
  let fontJSON = "";
  const hasText3D = objects.some((o) => o.geometry === "text3d");
  if (hasText3D) {
    try {
      const res = await fetch("/fonts/inter_bold.json");
      fontJSON = await res.text();
    } catch {}
  }

  const sceneData = {
    objects,
    environment: state.environment,
    bgColor: state.bgColor,
    slides: state.slides,
    cameraPosition: state.cameraPosition,
    cameraTarget: state.cameraTarget,
  };

  // Inject scene data + font into the embed template
  let injection = `<script>window.__TRESDE_DATA__=${JSON.stringify(sceneData)};`;
  if (fontJSON) {
    injection += `\nwindow.__TRESDE_FONT__=${JSON.stringify(fontJSON)};`;
  }
  injection += `</script>`;
  let html = embedTemplate.replace("</head>", `${injection}\n</head>`);
  return html;
}

export type { ExportState };

export async function publishScene(
  html: string,
  sceneData: ExportState,
  title?: string,
  sceneId?: string | null
): Promise<{ url: string; id: string }> {
  const res = await fetch("/api/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, sceneData, title, sceneId }),
  });
  if (!res.ok) throw new Error("Failed to publish scene");
  return res.json();
}

export function downloadHTML(html: string, filename = "tresde-scene.html") {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
