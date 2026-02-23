import { useSceneStore } from "../store/scene";

function generateJSX(): string {
  const { objects, environment } = useSceneStore.getState();

  const lines: string[] = [
    `import { Canvas } from "@react-three/fiber"`,
    `import { OrbitControls, Environment, ContactShadows, Float, RoundedBox, Dodecahedron, MeshTransmissionMaterial, MeshDistortMaterial, MeshWobbleMaterial, Text3D, Center } from "@react-three/drei"`,
    ``,
    `export default function Scene() {`,
    `  return (`,
    `    <Canvas shadows camera={{ position: [5, 4, 5], fov: 50 }}>`,
    `      <Environment preset="${environment}" background blur={0.5} />`,
    `      <ambientLight intensity={0.3} />`,
    `      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />`,
    ``,
  ];

  for (const obj of objects) {
    const pos = `position={[${obj.position.map((n) => n.toFixed(2)).join(", ")}]}`;
    const rot = `rotation={[${obj.rotation.map((n) => n.toFixed(2)).join(", ")}]}`;
    const scl = `scale={[${obj.scale.map((n) => n.toFixed(2)).join(", ")}]}`;

    const materialTag = getMaterialTag(obj);

    const wrapFloat = obj.animation === "float";
    const indent = "      ";

    if (wrapFloat) lines.push(`${indent}<Float speed={2} rotationIntensity={0.3} floatIntensity={1}>`);

    const meshIndent = wrapFloat ? indent + "  " : indent;

    if (obj.geometry === "roundedBox") {
      lines.push(`${meshIndent}<RoundedBox ${pos} ${rot} ${scl} args={[1, 1, 1]} radius={0.1}>`);
      lines.push(`${meshIndent}  ${materialTag}`);
      lines.push(`${meshIndent}</RoundedBox>`);
    } else if (obj.geometry === "text3d") {
      lines.push(`${meshIndent}<Center ${pos} ${rot} ${scl}>`);
      lines.push(`${meshIndent}  <Text3D font="/fonts/inter_bold.json" size={0.5} height={0.1}>`);
      lines.push(`${meshIndent}    ${obj.text || "Hola"}`);
      lines.push(`${meshIndent}    ${materialTag}`);
      lines.push(`${meshIndent}  </Text3D>`);
      lines.push(`${meshIndent}</Center>`);
    } else {
      const geo = {
        box: `<boxGeometry args={[1, 1, 1]} />`,
        sphere: `<sphereGeometry args={[0.6, 32, 32]} />`,
        torus: `<torusGeometry args={[0.5, 0.2, 16, 32]} />`,
        dodecahedron: `<dodecahedronGeometry args={[0.6]} />`,
        cylinder: `<cylinderGeometry args={[0.5, 0.5, 0.1, 64]} />`,
      }[obj.geometry] || `<boxGeometry />`;

      lines.push(`${meshIndent}<mesh ${pos} ${rot} ${scl} castShadow>`);
      lines.push(`${meshIndent}  ${geo}`);
      lines.push(`${meshIndent}  ${materialTag}`);
      lines.push(`${meshIndent}</mesh>`);
    }

    if (wrapFloat) lines.push(`${indent}</Float>`);
    lines.push(``);
  }

  lines.push(`      <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={10} blur={2} />`);
  lines.push(`      <OrbitControls />`);
  lines.push(`    </Canvas>`);
  lines.push(`  )`);
  lines.push(`}`);

  return lines.join("\n");
}

function getMaterialTag(obj: any): string {
  switch (obj.material) {
    case "transmission":
      return `<MeshTransmissionMaterial color="${obj.color}" transmission={${obj.transmission ?? 0.9}} thickness={${obj.thickness ?? 0.5}} roughness={${obj.roughness}} />`;
    case "distort":
      return `<MeshDistortMaterial color="${obj.color}" metalness={${obj.metalness}} roughness={${obj.roughness}} distort={${obj.distort ?? 0.4}} speed={${obj.speed ?? 2}} />`;
    case "wobble":
      return `<MeshWobbleMaterial color="${obj.color}" metalness={${obj.metalness}} roughness={${obj.roughness}} factor={${obj.distort ?? 0.4}} speed={${obj.speed ?? 2}} />`;
    default:
      return `<meshStandardMaterial color="${obj.color}" metalness={${obj.metalness}} roughness={${obj.roughness}} />`;
  }
}

export function CodePreview({ onClose }: { onClose: () => void }) {
  const code = generateJSX();

  const copy = () => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="absolute inset-4 bg-zinc-900/95 backdrop-blur-sm rounded-xl border border-zinc-700 flex flex-col overflow-hidden z-50">
      <div className="flex items-center justify-between p-3 border-b border-zinc-800">
        <span className="text-sm font-medium text-zinc-300">Código JSX generado</span>
        <div className="flex gap-2">
          <button
            onClick={copy}
            className="text-xs bg-violet-600 hover:bg-violet-500 px-3 py-1 rounded-md"
          >
            Copiar
          </button>
          <button
            onClick={onClose}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded-md"
          >
            Cerrar
          </button>
        </div>
      </div>
      <pre className="flex-1 overflow-auto p-4 text-xs text-zinc-300 font-mono leading-relaxed">
        {code}
      </pre>
    </div>
  );
}
