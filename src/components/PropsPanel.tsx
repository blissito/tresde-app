import { useGLTF } from "@react-three/drei";
import { useSceneStore, type MaterialType, type AnimationType, type HoverPreset } from "../store/scene";

const materials: { value: MaterialType; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "transmission", label: "Glass" },
  { value: "distort", label: "Distort" },
  { value: "wobble", label: "Wobble" },
];

const animations: { value: AnimationType; label: string }[] = [
  { value: "none", label: "Ninguna" },
  { value: "float", label: "Float" },
  { value: "rotate", label: "Rotate" },
  { value: "orbit", label: "Orbit" },
];

export function PropsPanel() {
  const selectedId = useSceneStore((s) => s.selectedId);
  const objects = useSceneStore((s) => s.objects);
  const updateObject = useSceneStore((s) => s.updateObject);

  const obj = objects.find((o) => o.id === selectedId);
  if (!obj) return null;

  const update = (updates: Parameters<typeof updateObject>[1]) =>
    updateObject(obj.id, updates);

  return (
    <div className="w-64 bg-zinc-900 border-l border-zinc-800 overflow-y-auto p-3 space-y-4">
      <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
        {obj.name}
      </h3>

      {/* Color */}
      <Field label="Color">
        <input
          type="color"
          value={obj.color}
          onChange={(e) => update({ color: e.target.value })}
          className="w-full h-8 rounded cursor-pointer bg-transparent"
        />
      </Field>

      {/* Material */}
      <Field label="Material">
        <select
          value={obj.material}
          onChange={(e) => update({ material: e.target.value as MaterialType })}
          className="w-full bg-zinc-800 text-sm rounded-md px-2 py-1.5 border border-zinc-700 text-white"
        >
          {materials.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </Field>

      {/* Metalness / Roughness */}
      <Slider label="Metalness" value={obj.metalness} onChange={(v) => update({ metalness: v })} />
      <Slider label="Roughness" value={obj.roughness} onChange={(v) => update({ roughness: v })} />

      {/* Material-specific */}
      {obj.material === "transmission" && (
        <>
          <Slider label="Transmission" value={obj.transmission ?? 0.9} onChange={(v) => update({ transmission: v })} />
          <Slider label="Thickness" value={obj.thickness ?? 0.5} onChange={(v) => update({ thickness: v })} max={2} />
        </>
      )}
      {(obj.material === "distort" || obj.material === "wobble") && (
        <>
          <Slider label="Distort" value={obj.distort ?? 0.4} onChange={(v) => update({ distort: v })} />
          <Slider label="Speed" value={obj.speed ?? 2} onChange={(v) => update({ speed: v })} max={10} />
        </>
      )}

      {/* Animation */}
      <Field label="Animación">
        <div className="flex gap-1">
          {animations.map((a) => (
            <button
              key={a.value}
              onClick={() => update({ animation: a.value })}
              className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
                obj.animation === a.value
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Texture */}
      <Field label="Textura">
        <div className="flex gap-1">
          <label className="flex-1 text-xs py-1.5 rounded-md bg-zinc-800 text-zinc-400 hover:text-white text-center cursor-pointer transition-colors">
            Upload Image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => update({ textureUrl: reader.result as string });
                reader.readAsDataURL(file);
                e.target.value = "";
              }}
            />
          </label>
          {obj.textureUrl && (
            <button
              onClick={() => update({ textureUrl: undefined })}
              className="text-xs py-1.5 px-2 rounded-md bg-zinc-800 text-red-400 hover:text-red-300 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
        {obj.textureUrl && (
          <img src={obj.textureUrl} alt="texture" className="mt-1 w-full h-16 object-cover rounded-md" />
        )}
      </Field>

      {/* Orbit params */}
      {obj.animation === "orbit" && (
        <>
          <Slider label="Orbit Radius" value={obj.orbitRadius ?? 2} onChange={(v) => update({ orbitRadius: v })} min={0.5} max={5} step={0.1} />
          <Slider label="Orbit Speed" value={obj.orbitSpeed ?? 1} onChange={(v) => update({ orbitSpeed: v })} min={0.1} max={5} step={0.1} />
        </>
      )}

      {/* Text (for text3d) */}
      {obj.geometry === "text3d" && (
        <Field label="Texto">
          <input
            type="text"
            value={obj.text || ""}
            onChange={(e) => update({ text: e.target.value })}
            className="w-full bg-zinc-800 text-sm rounded-md px-2 py-1.5 border border-zinc-700 text-white"
          />
        </Field>
      )}

      {/* GLB Animation */}
      {obj.geometry === "glb" && obj.glbUrl && !obj.glbUrl.endsWith(".obj") && !obj.glbUrl.startsWith("data:text/plain") && (
        <GlbAnimationSelector url={obj.glbUrl} value={obj.glbAnimation} onChange={(v) => update({ glbAnimation: v })} />
      )}

      {/* Hover Interactions */}
      <HoverSection obj={obj} update={update} />
    </div>
  );
}

function GlbAnimationSelector({ url, value, onChange }: { url: string; value?: string; onChange: (v: string | undefined) => void }) {
  const { animations } = useGLTF(url);
  if (!animations || animations.length === 0) return null;

  return (
    <Field label="Animación GLB">
      <select
        value={value ?? "__first__"}
        onChange={(e) => onChange(e.target.value === "__none__" ? "__none__" : e.target.value)}
        className="w-full bg-zinc-800 text-sm rounded-md px-2 py-1.5 border border-zinc-700 text-white"
      >
        <option value="__none__">Ninguna</option>
        <option value="__first__">Primera (default)</option>
        {animations.map((a) => (
          <option key={a.name} value={a.name}>{a.name}</option>
        ))}
      </select>
    </Field>
  );
}

const hoverPresets: { value: HoverPreset; label: string; icon: string }[] = [
  { value: "none", label: "None", icon: "○" },
  { value: "lift", label: "Lift", icon: "↑" },
  { value: "grow", label: "Grow", icon: "⊕" },
  { value: "spin", label: "Spin", icon: "↻" },
  { value: "tilt", label: "Tilt", icon: "∠" },
  { value: "glow", label: "Glow", icon: "✦" },
  { value: "explode", label: "Explode", icon: "✸" },
];

function HoverSection({ obj, update }: { obj: ReturnType<typeof useSceneStore.getState>["objects"][0]; update: (u: any) => void }) {
  const current = obj.hoverPreset || "none";

  const applyPreset = (preset: HoverPreset) => {
    if (preset === "none") {
      update({
        hoverPreset: undefined,
        hoverPosition: undefined,
        hoverRotation: undefined,
        hoverScale: undefined,
        hoverColor: undefined,
        hoverGroup: undefined,
      });
      return;
    }
    update({ hoverPreset: preset, ...resolvePreset(preset, obj) });
  };

  return (
    <div className="space-y-3 border-t border-zinc-800 pt-3">
      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Hover Effect</span>
      <div className="grid grid-cols-4 gap-1">
        {hoverPresets.map((p) => (
          <button
            key={p.value}
            onClick={() => applyPreset(p.value)}
            className={`flex flex-col items-center gap-0.5 py-1.5 rounded-md text-xs transition-colors ${
              current === p.value
                ? "bg-violet-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <span className="text-sm leading-none">{p.icon}</span>
            <span className="text-[10px]">{p.label}</span>
          </button>
        ))}
      </div>

      {current !== "none" && current === "explode" && (
        <Field label="Hover Group">
          <input
            type="text"
            value={obj.hoverGroup || ""}
            onChange={(e) => update({ hoverGroup: e.target.value || undefined })}
            placeholder="e.g. robot"
            className="w-full bg-zinc-800 text-sm rounded-md px-2 py-1.5 border border-zinc-700 text-white placeholder-zinc-600"
          />
        </Field>
      )}
    </div>
  );
}

function resolvePreset(preset: HoverPreset, obj: ReturnType<typeof useSceneStore.getState>["objects"][0]) {
  const p = obj.position;
  const s = obj.scale;
  const r = obj.rotation;

  switch (preset) {
    case "lift":
      return {
        hoverPosition: [p[0], p[1] + 0.3, p[2]] as [number, number, number],
        hoverScale: [s[0] * 1.05, s[1] * 1.05, s[2] * 1.05] as [number, number, number],
      };
    case "grow":
      return {
        hoverScale: [s[0] * 1.2, s[1] * 1.2, s[2] * 1.2] as [number, number, number],
      };
    case "spin":
      return {
        hoverRotation: [r[0], r[1] + Math.PI / 2, r[2]] as [number, number, number],
      };
    case "tilt":
      return {
        hoverRotation: [r[0] + 0.15, r[1] + 0.15, r[2]] as [number, number, number],
      };
    case "glow":
      // Brighten the color
      return {
        hoverColor: brighten(obj.color, 1.4),
        hoverScale: [s[0] * 1.05, s[1] * 1.05, s[2] * 1.05] as [number, number, number],
      };
    case "explode":
      // Move outward from origin based on current position
      const dist = 0.6;
      const len = Math.sqrt(p[0] * p[0] + p[2] * p[2]) || 1;
      const nx = p[0] / len;
      const nz = p[2] / len;
      return {
        hoverPosition: [p[0] + nx * dist, p[1] + 0.2, p[2] + nz * dist] as [number, number, number],
        hoverRotation: [r[0] + 0.1, r[1] + 0.2, r[2] + 0.1] as [number, number, number],
      };
    default:
      return {};
  }
}

function brighten(hex: string, factor: number): string {
  const r = Math.min(255, Math.round(parseInt(hex.slice(1, 3), 16) * factor));
  const g = Math.min(255, Math.round(parseInt(hex.slice(3, 5), 16) * factor));
  const b = Math.min(255, Math.round(parseInt(hex.slice(5, 7), 16) * factor));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-zinc-500 mb-1 block">{label}</label>
      {children}
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-zinc-500">{label}</span>
        <span className="text-zinc-400">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-violet-500"
      />
    </div>
  );
}
