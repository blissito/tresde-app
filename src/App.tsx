import { Canvas3D } from "./components/Canvas3D";
import { Sidebar } from "./components/Sidebar";
import { PropsPanel } from "./components/PropsPanel";
import { CodePreview } from "./components/CodePreview";
import { useSceneStore } from "./store/scene";
import { useState } from "react";

export default function App() {
  const [showCode, setShowCode] = useState(false);
  const selectedId = useSceneStore((s) => s.selectedId);

  return (
    <div className="h-screen w-screen flex bg-zinc-950">
      <Sidebar />
      <div className="flex-1 relative">
        <Canvas3D />
        <div className="absolute top-4 right-4 flex gap-2">
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
    </div>
  );
}
