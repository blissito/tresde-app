import { Canvas3D } from "./components/Canvas3D";
import { Sidebar } from "./components/Sidebar";
import { PropsPanel } from "./components/PropsPanel";
import { CodePreview } from "./components/CodePreview";
import { useSceneStore } from "./store/scene";
import { useState, useEffect } from "react";
import { epicHeroTemplate, epicHeroEnvironment } from "./templates/epic-hero";

function EmbedView() {
  const loadTemplate = useSceneStore((s) => s.loadTemplate);
  const setEnvironment = useSceneStore((s) => s.setEnvironment);

  useEffect(() => {
    loadTemplate(epicHeroTemplate);
    setEnvironment(epicHeroEnvironment);
  }, []);

  return (
    <div className="h-screen w-screen relative bg-black">
      <Canvas3D embed />
      {/* Marca de agua — se quita con plan de pago */}
      <a
        href="https://tresde.app"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 text-white/40 text-xs hover:text-white/70 transition-colors"
      >
        hecho con tresde.app
      </a>
    </div>
  );
}

function EditorView() {
  const [showCode, setShowCode] = useState(false);
  const [preview, setPreview] = useState(false);
  const selectedId = useSceneStore((s) => s.selectedId);

  return (
    <div className="h-screen w-screen flex bg-zinc-950">
      <Sidebar />
      <div className="flex-1 relative">
        <Canvas3D />
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={() => setPreview(true)}
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
        </div>
        {showCode && <CodePreview onClose={() => setShowCode(false)} />}
      </div>
      {selectedId && <PropsPanel />}

      {/* Preview overlay */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black">
          <Canvas3D embed />
          <button
            onClick={() => setPreview(false)}
            className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 text-white text-sm px-3 py-1.5 rounded-lg backdrop-blur-sm transition-colors"
          >
            ✕ Salir
          </button>
          <div className="absolute bottom-3 right-3 text-white/30 text-xs">
            Vista previa
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
