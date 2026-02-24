import { Canvas3D, scrollOffsetRef, cameraStateRef } from "./components/Canvas3D";
import { Sidebar } from "./components/Sidebar";
import { PropsPanel } from "./components/PropsPanel";
import { CodePreview } from "./components/CodePreview";
import { useSceneStore } from "./store/scene";
import { useState, useEffect, useRef } from "react";
import { epicHeroTemplate, epicHeroEnvironment } from "./templates/epic-hero";
import { decodeScene } from "./lib/share";
import { generateHTML, downloadHTML, publishScene } from "./lib/exportHTML";
import { WaitlistModal } from "./components/WaitlistModal";
import toast, { Toaster } from "react-hot-toast";

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
        href="https://tresde-app.fly.dev"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 text-white/40 text-xs hover:text-white/70 transition-colors z-20"
      >
        hecho con tresde.app
      </a>
    </div>
  );
}

function SnippetBlock({ label, code, copied, onCopy, last }: { label: string; code: string; copied: boolean; onCopy: () => void; last?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div className={last ? "" : "mb-4"}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-zinc-300">{label}</span>
        <button onClick={onCopy} className="text-xs text-violet-400 hover:text-violet-300">
          {copied ? '✓ Copiado' : 'Copiar'}
        </button>
      </div>
      <div
        ref={ref}
        onClick={() => {
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(ref.current!);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }}
        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-emerald-400 font-mono break-all cursor-text focus:outline-none select-all"
      >{code}</div>
    </div>
  );
}

function EmbedModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const iframeCode = `<iframe src="${url}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none" allowfullscreen></iframe>`;

  const copy = async (code: string, label: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedSnippet(label);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg mx-4 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Embed en tu sitio</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">&times;</button>
        </div>

        <p className="text-zinc-400 text-sm mb-4">Copia el código y pégalo en el HTML de tu sitio web.</p>

        <SnippetBlock label="Código embed" code={iframeCode} copied={copiedSnippet === 'iframe'} onCopy={() => copy(iframeCode, 'iframe')} />
        <SnippetBlock label="URL directa" code={url} copied={copiedSnippet === 'url'} onCopy={() => copy(url, 'url')} last />

        <div className="mt-5 pt-4 border-t border-zinc-800 text-center">
          <p className="text-zinc-500 text-xs mb-1">Hecho con tresde.app</p>
          <a
            href="https://fixter.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:text-violet-300 text-sm font-medium transition-colors"
          >
            fixter.org — Aprende a construir productos como este
          </a>
        </div>
      </div>
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
  const [showEmbed, setShowEmbed] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingRec, setIsPlayingRec] = useState(false);
  const cameraRecording = useSceneStore((s) => s.cameraRecording);
  const setCameraRecording = useSceneStore((s) => s.setCameraRecording);
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
      .catch((e) => toast.error("No se pudo importar la escena"));
  }, [loadScene]);

  useEffect(() => {
    fetch("/api/scenes")
      .then((r) => r.json())
      .then((scenes: { id: string; url: string }[]) => {
        if (scenes.length > 0) {
          setPublishedUrl(scenes[0].url);
          // Only set currentSceneId if store doesn't already have one (don't override imports)
          const s = useSceneStore.getState();
          if (!s.currentSceneId) s.setCurrentSceneId(scenes[0].id);
        }
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
            onClick={() => {
              const cam = cameraStateRef.current;
              useSceneStore.getState().setCameraState(cam.position, cam.target);
              scrollOffsetRef.current = 0;
              setPreview(true);
            }}
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
                const cam = cameraStateRef.current;
                useSceneStore.getState().setCameraState(cam.position, cam.target);
                const s = useSceneStore.getState();
                const html = await generateHTML({
                  objects: s.objects,
                  environment: s.environment,
                  bgColor: s.bgColor,
                  slides: s.slides,
                  cameraPosition: s.cameraPosition,
                  cameraTarget: s.cameraTarget,
                  cameraFollowIntensity: s.cameraFollowIntensity,
                  cameraRecording: s.cameraRecording,
                });
                downloadHTML(html);
                toast.success("HTML descargado");
              } catch (e) {
                toast.error("Error al exportar: " + (e instanceof Error ? e.message : e));
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
                const cam = cameraStateRef.current;
                useSceneStore.getState().setCameraState(cam.position, cam.target);
                const s = useSceneStore.getState();
                const sceneState = {
                  objects: s.objects,
                  environment: s.environment,
                  bgColor: s.bgColor,
                  slides: s.slides,
                  cameraPosition: s.cameraPosition,
                  cameraTarget: s.cameraTarget,
                  cameraFollowIntensity: s.cameraFollowIntensity,
                  cameraRecording: s.cameraRecording,
                };
                const html = await generateHTML(sceneState);
                const { url, id } = await publishScene(html, sceneState, undefined, s.currentSceneId);
                useSceneStore.getState().setCurrentSceneId(id);
                setPublishedUrl(url);
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 3000);
                toast.success("Publicado — URL copiada al portapapeles");
              } catch (e) {
                console.error("Publish failed:", e);
                toast.error("Error al publicar: " + (e instanceof Error ? e.message : e));
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
          {publishedUrl && (
            <button
              onClick={() => setShowEmbed(true)}
              className="bg-zinc-800 hover:bg-zinc-700 text-sm px-3 py-1.5 rounded-lg border border-zinc-700"
            >
              {"</>"} Embed
            </button>
          )}
        </div>
        {showCode && <CodePreview onClose={() => setShowCode(false)} />}
      </div>
      {selectedId && <PropsPanel />}

      {showWaitlist && <WaitlistModal onClose={() => setShowWaitlist(false)} />}

      {/* Embed code modal */}
      {showEmbed && publishedUrl && (
        <EmbedModal url={publishedUrl} onClose={() => setShowEmbed(false)} />
      )}
      <Toaster position="bottom-right" containerStyle={{ zIndex: 9999 }} toastOptions={{ style: { background: '#18181b', color: '#fff', border: '1px solid #3f3f46' } }} />

      {/* Preview overlay */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black overflow-hidden">
          <Canvas3D embed preserveCamera onSlideChange={setPreviewSlide} isRecording={isRecording} isPlaying={isPlayingRec} />
          {slides.length >= 2 && !isPlayingRec && <SlideTextOverlay slideIndex={previewSlide} />}
          <button
            onClick={() => { setIsRecording(false); setIsPlayingRec(false); setPreview(false); }}
            className="absolute top-4 right-4 z-50 bg-zinc-900/80 hover:bg-zinc-800/90 text-white text-sm px-3 py-1.5 rounded-lg backdrop-blur-sm border border-zinc-700/50 transition-colors"
          >
            ✕ Salir
          </button>
          {/* Camera recording controls */}
          <div className="absolute top-4 left-4 z-50 flex gap-2">
            {!isRecording && !isPlayingRec && (
              <button
                onClick={() => setIsRecording(true)}
                className="bg-red-600 hover:bg-red-500 text-white text-sm px-3 py-1.5 rounded-lg border border-red-500 font-medium flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> REC
              </button>
            )}
            {isRecording && (
              <button
                onClick={() => setIsRecording(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-3 py-1.5 rounded-lg border border-zinc-600 font-medium"
              >
                ■ Stop
              </button>
            )}
            {!isRecording && cameraRecording.length >= 2 && (
              <>
                <button
                  onClick={() => setIsPlayingRec(!isPlayingRec)}
                  className={`text-white text-sm px-3 py-1.5 rounded-lg border font-medium ${
                    isPlayingRec ? "bg-violet-600 border-violet-500" : "bg-zinc-800 border-zinc-600 hover:bg-zinc-700"
                  }`}
                >
                  {isPlayingRec ? "⏸ Pause" : "▶ Play"}
                </button>
                {!isPlayingRec && (
                  <button
                    onClick={() => setCameraRecording([])}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-3 py-1.5 rounded-lg border border-zinc-600 font-medium"
                  >
                    ✕ Clear
                  </button>
                )}
              </>
            )}
            {isRecording && (
              <span className="text-red-400 text-sm self-center animate-pulse">Grabando...</span>
            )}
            {!isRecording && cameraRecording.length >= 2 && !isPlayingRec && (
              <span className="text-white/40 text-sm self-center">{cameraRecording.length} keyframes</span>
            )}
          </div>
          <div className="absolute bottom-3 right-3 text-white/30 text-xs pointer-events-none">
            {isPlayingRec ? "Reproduciendo grabación" : slides.length >= 2 ? "Scroll para navegar" : "Vista previa"}
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
