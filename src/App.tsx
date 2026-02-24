import { Canvas3D, scrollOffsetRef } from "./components/Canvas3D";
import { Sidebar } from "./components/Sidebar";
import { PropsPanel } from "./components/PropsPanel";
import { CodePreview } from "./components/CodePreview";
import { useSceneStore } from "./store/scene";
import { useState, useEffect } from "react";
import { epicHeroTemplate, epicHeroEnvironment } from "./templates/epic-hero";
import { decodeScene } from "./lib/share";
import { generateHTML, downloadHTML, publishScene } from "./lib/exportHTML";
import { WaitlistModal } from "./components/WaitlistModal";

function SlideTextOverlay({ slideIndex }: { slideIndex: number }) {
  const slides = useSceneStore((s) => s.slides);
  const slide = slides[slideIndex];
  const text = slide?.text;

  if (!text) return null;

  return (
    <div
      key={slideIndex}
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
    >
      <p className="text-white text-3xl md:text-5xl font-bold text-center px-8 drop-shadow-lg animate-fade-in">
        {text}
      </p>
    </div>
  );
}

function EmbedView() {
  const loadTemplate = useSceneStore((s) => s.loadTemplate);
  const setEnvironment = useSceneStore((s) => s.setEnvironment);
  const loadScene = useSceneStore((s) => s.loadScene);
  const slides = useSceneStore((s) => s.slides);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const shared = decodeScene(window.location.hash);
    if (shared) {
      loadScene(shared);
    } else {
      loadTemplate(epicHeroTemplate);
      setEnvironment(epicHeroEnvironment);
    }
  }, []);

  return (
    <div className="h-screen w-screen relative bg-black overflow-hidden">
      <Canvas3D embed onSlideChange={setCurrentSlide} />
      {slides.length >= 2 && <SlideTextOverlay slideIndex={currentSlide} />}
      <a
        href="https://tresde.app"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 text-white/40 text-xs hover:text-white/70 transition-colors z-20"
      >
        hecho con tresde.app
      </a>
    </div>
  );
}

function EditorView() {
  const [showCode, setShowCode] = useState(false);
  const [preview, setPreview] = useState(false);
  const [previewSlide, setPreviewSlide] = useState(0);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const selectedId = useSceneStore((s) => s.selectedId);
  const slides = useSceneStore((s) => s.slides);
  const loadScene = useSceneStore((s) => s.loadScene);
  const removeObject = useSceneStore((s) => s.removeObject);
  const duplicateObject = useSceneStore((s) => s.duplicateObject);

  // Import scene from ?import= param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const importId = params.get("import");
    if (!importId) return;
    fetch(`/api/scenes/${importId}/data`)
      .then((r) => { if (!r.ok) throw new Error("Scene not found"); return r.json(); })
      .then((data) => {
        loadScene(data);
        window.history.replaceState({}, "", "/");
      })
      .catch((e) => console.error("Failed to import scene:", e));
  }, [loadScene]);

  useEffect(() => {
    fetch("/api/scenes")
      .then((r) => r.json())
      .then((scenes: { url: string }[]) => {
        if (scenes.length > 0) setPublishedUrl(scenes[0].url);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/waitlist/status")
      .then((r) => r.json())
      .then((data) => { if (!data.registered) setShowWaitlist(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const sel = useSceneStore.getState().selectedId;
      if (!sel) return;
      if ((e.key === "Backspace" || e.key === "Delete") && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
        removeObject(sel);
      }
      if (e.key === "d" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        duplicateObject(sel);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [removeObject, duplicateObject]);

  return (
    <div className="h-screen w-screen flex bg-zinc-950">
      <Sidebar />
      <div className="flex-1 relative">
        <Canvas3D />
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={() => { scrollOffsetRef.current = 0; setPreview(true); }}
            className="bg-violet-600 hover:bg-violet-500 text-sm px-3 py-1.5 rounded-lg border border-violet-500 font-medium"
          >
            ▶ Play
          </button>
          <button
            onClick={() => setShowCode(!showCode)}
            className="bg-zinc-800 hover:bg-zinc-700 text-sm px-3 py-1.5 rounded-lg border border-zinc-700"
          >
            {showCode ? "Cerrar código" : "Ver código"}
          </button>
          <button
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                const s = useSceneStore.getState();
                const html = await generateHTML({
                  objects: s.objects,
                  environment: s.environment,
                  bgColor: s.bgColor,
                  slides: s.slides,
                  cameraPosition: s.cameraPosition,
                  cameraTarget: s.cameraTarget,
                });
                downloadHTML(html);
              } finally {
                setExporting(false);
              }
            }}
            className="bg-violet-600 hover:bg-violet-500 text-sm px-3 py-1.5 rounded-lg border border-violet-500 font-medium disabled:opacity-50"
          >
            {exporting ? "Exportando..." : "Exportar HTML"}
          </button>
          <button
            disabled={publishing}
            onClick={async () => {
              setPublishing(true);
              try {
                const s = useSceneStore.getState();
                const sceneState = {
                  objects: s.objects,
                  environment: s.environment,
                  bgColor: s.bgColor,
                  slides: s.slides,
                  cameraPosition: s.cameraPosition,
                  cameraTarget: s.cameraTarget,
                };
                const html = await generateHTML(sceneState);
                const { url } = await publishScene(html, sceneState);
                setPublishedUrl(url);
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 3000);
              } catch (e) {
                console.error("Publish failed:", e);
              } finally {
                setPublishing(false);
              }
            }}
            className={`text-sm px-3 py-1.5 rounded-lg border font-medium disabled:opacity-50 ${
              publishedUrl
                ? "bg-emerald-600 hover:bg-emerald-500 border-emerald-500"
                : "bg-violet-600 hover:bg-violet-500 border-violet-500"
            }`}
          >
            {publishing ? "Publicando..." : copied ? "✓ Copiado!" : publishedUrl ? "Publicado" : "Publicar"}
          </button>
        </div>
        {showCode && <CodePreview onClose={() => setShowCode(false)} />}
      </div>
      {selectedId && <PropsPanel />}

      {showWaitlist && <WaitlistModal onClose={() => setShowWaitlist(false)} />}

      {/* Preview overlay */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black overflow-hidden">
          <Canvas3D embed preserveCamera onSlideChange={setPreviewSlide} />
          {slides.length >= 2 && <SlideTextOverlay slideIndex={previewSlide} />}
          <button
            onClick={() => setPreview(false)}
            className="absolute top-4 right-4 z-50 bg-zinc-900/80 hover:bg-zinc-800/90 text-white text-sm px-3 py-1.5 rounded-lg backdrop-blur-sm border border-zinc-700/50 transition-colors"
          >
            ✕ Salir
          </button>
          <div className="absolute bottom-3 right-3 text-white/30 text-xs pointer-events-none">
            {slides.length >= 2 ? "Scroll para navegar" : "Vista previa"}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const isEmbed = window.location.pathname === "/embed";

  if (isEmbed) return <EmbedView />;
  return <EditorView />;
}
