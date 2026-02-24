import { useSceneStore, type GeometryType } from "../store/scene";
import { cameraStateRef } from "./Canvas3D";
import { glassHeroTemplate } from "../templates/glass-hero";
import { epicHeroTemplate, epicHeroEnvironment } from "../templates/epic-hero";

// Auto-discover 3D model files from public/assets/
const glbFiles = Object.keys(
  import.meta.glob("/public/assets/glbs/*.{glb,obj}", { eager: false })
).map((path) => {
  const filename = path.split("/").pop()!;
  const name = filename.replace(/\.(glb|obj)$/i, "");
  return { name, url: `/assets/glbs/${filename}` };
});

const objFiles = Object.keys(
  import.meta.glob("/public/assets/objs/*.obj", { eager: false })
).map((path) => {
  const filename = path.split("/").pop()!;
  const name = filename.replace(/\.obj$/i, "");
  return { name, url: `/assets/objs/${filename}` };
});

const modelFiles = [...glbFiles, ...objFiles];

const primitives: { type: GeometryType; label: string; icon: string }[] = [
  { type: "box", label: "Cubo", icon: "□" },
  { type: "sphere", label: "Esfera", icon: "○" },
  { type: "torus", label: "Torus", icon: "◎" },
  { type: "roundedBox", label: "RoundedBox", icon: "▢" },
  { type: "dodecahedron", label: "Dodecaedro", icon: "⬡" },
  { type: "text3d", label: "Texto 3D", icon: "A" },
  { type: "cylinder", label: "Moneda", icon: "🪙" },
];

const environments = ["city", "studio", "sunset", "dawn", "night", "forest", "apartment", "lobby", "park", "warehouse"];

const bgPresets = [
  { label: "Negro", color: "#000000" },
  { label: "Oscuro", color: "#0a0a0a" },
  { label: "Zinc", color: "#18181b" },
  { label: "Slate", color: "#0f172a" },
  { label: "Navy", color: "#0c1445" },
  { label: "Violeta", color: "#1e1040" },
  { label: "Blanco", color: "#ffffff" },
  { label: "Crema", color: "#faf5ee" },
];

export function Sidebar() {
  const addObject = useSceneStore((s) => s.addObject);
  const objects = useSceneStore((s) => s.objects);
  const selectedId = useSceneStore((s) => s.selectedId);
  const selectObject = useSceneStore((s) => s.selectObject);
  const removeObject = useSceneStore((s) => s.removeObject);
  const environment = useSceneStore((s) => s.environment);
  const setEnvironment = useSceneStore((s) => s.setEnvironment);
  const bgColor = useSceneStore((s) => s.bgColor);
  const setBgColor = useSceneStore((s) => s.setBgColor);
  const transformMode = useSceneStore((s) => s.transformMode);
  const setTransformMode = useSceneStore((s) => s.setTransformMode);
  const loadTemplate = useSceneStore((s) => s.loadTemplate);
  const slides = useSceneStore((s) => s.slides);
  const activeSlideId = useSceneStore((s) => s.activeSlideId);
  const addSlide = useSceneStore((s) => s.addSlide);
  const removeSlide = useSceneStore((s) => s.removeSlide);
  const updateSlide = useSceneStore((s) => s.updateSlide);
  const reorderSlides = useSceneStore((s) => s.reorderSlides);
  const setActiveSlide = useSceneStore((s) => s.setActiveSlide);
  const flyToSlide = useSceneStore((s) => s.flyToSlide);

  return (
    <div className="w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full overflow-hidden">
      {/* Primitivas */}
      <div className="p-3 border-b border-zinc-800">
        <h3 className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Agregar</h3>
        <div className="grid grid-cols-3 gap-1.5">
          {primitives.map((p) => (
            <button
              key={p.type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/tresde-geometry", p.type);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => addObject(p.type)}
              className="flex flex-col items-center gap-0.5 p-2 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-grab active:cursor-grabbing"
              title={p.label}
            >
              <span className="text-lg">{p.icon}</span>
              <span className="text-[10px]">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Modelos 3D */}
      {modelFiles.length > 0 && (
        <div className="p-3 border-b border-zinc-800">
          <h3 className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Modelos 3D</h3>
          <div className="space-y-0.5">
            {modelFiles.map((glb) => (
              <button
                key={glb.url}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/tresde-glb", glb.url);
                  e.dataTransfer.setData("application/tresde-glb-name", glb.name);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => addObject("glb", undefined, { glbUrl: glb.url, name: glb.name })}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-grab active:cursor-grabbing text-left"
              >
                <span className="text-sm">📦</span>
                <span className="text-xs truncate">{glb.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* Background */}
      <div className="p-3 border-b border-zinc-800">
        <h3 className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Fondo</h3>
        <div className="flex gap-1.5 flex-wrap">
          {bgPresets.map((p) => (
            <button
              key={p.color}
              onClick={() => setBgColor(p.color)}
              className={`w-6 h-6 rounded-full border-2 transition-colors ${
                bgColor === p.color ? "border-violet-500" : "border-zinc-700 hover:border-zinc-500"
              }`}
              style={{ backgroundColor: p.color }}
              title={p.label}
            />
          ))}
        </div>
      </div>

      {/* Templates */}
      <div className="p-3 border-b border-zinc-800 space-y-1.5">
        <h3 className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Templates</h3>
        <button
          onClick={() => loadTemplate(glassHeroTemplate)}
          className="w-full text-sm py-2 rounded-lg bg-gradient-to-r from-violet-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity"
        >
          Glass Hero
        </button>
        <button
          onClick={() => {
            loadTemplate(epicHeroTemplate);
            setEnvironment(epicHeroEnvironment);
          }}
          className="w-full text-sm py-2 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 text-white font-medium hover:opacity-90 transition-opacity"
        >
          Epic Hero
        </button>
      </div>

      {/* Slides */}
      <div className="p-3 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Slides</h3>
          <button
            onClick={() => {
              const { position, target } = cameraStateRef.current;
              console.log('[addSlide] pos:', [...position], 'target:', [...target]);
              addSlide([...position], [...target]);
            }}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded"
          >
            + Slide
          </button>
        </div>
        {slides.length === 0 && (
          <p className="text-xs text-zinc-600 italic">Mueve la cámara y agrega slides</p>
        )}
        <div className="space-y-0.5">
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              onClick={() => flyToSlide(slide.id)}
              className={`flex items-center justify-between px-2 py-1.5 rounded-md text-sm cursor-pointer group ${
                activeSlideId === slide.id
                  ? "bg-violet-600/20 text-violet-300"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] text-zinc-500 w-4">{i + 1}</span>
                <span className="truncate">{slide.name}</span>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const { position, target } = cameraStateRef.current;
                    updateSlide(slide.id, { cameraPosition: [...position], cameraTarget: [...target] });
                    console.log('[updateSlide]', slide.name, 'pos:', [...position], 'target:', [...target]);
                  }}
                  className="text-zinc-500 hover:text-violet-400 text-xs px-0.5"
                  title="Actualizar cámara del slide"
                >📷</button>
                {i > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); reorderSlides(i, i - 1); }}
                    className="text-zinc-500 hover:text-white text-xs px-0.5"
                  >↑</button>
                )}
                {i < slides.length - 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); reorderSlides(i, i + 1); }}
                    className="text-zinc-500 hover:text-white text-xs px-0.5"
                  >↓</button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); removeSlide(slide.id); }}
                  className="text-zinc-500 hover:text-red-400 text-xs px-0.5"
                >✕</button>
              </div>
            </div>
          ))}
        </div>
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
