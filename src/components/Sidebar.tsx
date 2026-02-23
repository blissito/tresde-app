import { useSceneStore, type GeometryType } from "../store/scene";
import { glassHeroTemplate } from "../templates/glass-hero";

const primitives: { type: GeometryType; label: string; icon: string }[] = [
  { type: "box", label: "Cubo", icon: "□" },
  { type: "sphere", label: "Esfera", icon: "○" },
  { type: "torus", label: "Torus", icon: "◎" },
  { type: "roundedBox", label: "RoundedBox", icon: "▢" },
  { type: "dodecahedron", label: "Dodecaedro", icon: "⬡" },
  { type: "text3d", label: "Texto 3D", icon: "A" },
];

const environments = ["city", "studio", "sunset", "dawn", "night", "forest", "apartment", "lobby", "park", "warehouse"];

export function Sidebar() {
  const addObject = useSceneStore((s) => s.addObject);
  const objects = useSceneStore((s) => s.objects);
  const selectedId = useSceneStore((s) => s.selectedId);
  const selectObject = useSceneStore((s) => s.selectObject);
  const removeObject = useSceneStore((s) => s.removeObject);
  const environment = useSceneStore((s) => s.environment);
  const setEnvironment = useSceneStore((s) => s.setEnvironment);
  const transformMode = useSceneStore((s) => s.transformMode);
  const setTransformMode = useSceneStore((s) => s.setTransformMode);
  const loadTemplate = useSceneStore((s) => s.loadTemplate);

  return (
    <div className="w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full overflow-hidden">
      {/* Primitivas */}
      <div className="p-3 border-b border-zinc-800">
        <h3 className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Agregar</h3>
        <div className="grid grid-cols-3 gap-1.5">
          {primitives.map((p) => (
            <button
              key={p.type}
              onClick={() => addObject(p.type)}
              className="flex flex-col items-center gap-0.5 p-2 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
              title={p.label}
            >
              <span className="text-lg">{p.icon}</span>
              <span className="text-[10px]">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Transform mode */}
      <div className="p-3 border-b border-zinc-800">
        <h3 className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Transformar</h3>
        <div className="flex gap-1">
          {(["translate", "rotate", "scale"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setTransformMode(mode)}
              className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
                transformMode === mode
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {mode === "translate" ? "Mover" : mode === "rotate" ? "Rotar" : "Escalar"}
            </button>
          ))}
        </div>
      </div>

      {/* Environment */}
      <div className="p-3 border-b border-zinc-800">
        <h3 className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Ambiente</h3>
        <select
          value={environment}
          onChange={(e) => setEnvironment(e.target.value)}
          className="w-full bg-zinc-800 text-sm rounded-md px-2 py-1.5 border border-zinc-700 text-white"
        >
          {environments.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      {/* Template */}
      <div className="p-3 border-b border-zinc-800">
        <button
          onClick={() => loadTemplate(glassHeroTemplate)}
          className="w-full text-sm py-2 rounded-lg bg-gradient-to-r from-violet-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity"
        >
          Cargar Glass Hero
        </button>
      </div>

      {/* Scene graph */}
      <div className="flex-1 overflow-y-auto p-3">
        <h3 className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Escena</h3>
        {objects.length === 0 && (
          <p className="text-xs text-zinc-600 italic">Agrega un objeto para empezar</p>
        )}
        <div className="space-y-0.5">
          {objects.map((obj) => (
            <div
              key={obj.id}
              onClick={() => selectObject(obj.id)}
              className={`flex items-center justify-between px-2 py-1.5 rounded-md text-sm cursor-pointer group ${
                selectedId === obj.id
                  ? "bg-violet-600/20 text-violet-300"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <span className="truncate">{obj.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeObject(obj.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
