import { useSceneStore, type MaterialType, type AnimationType } from "../store/scene";

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
    </div>
  );
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
