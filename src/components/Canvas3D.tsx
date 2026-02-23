import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  Environment,
  ContactShadows,
  GizmoHelper,
  GizmoViewport,
} from "@react-three/drei";
import { useSceneStore } from "../store/scene";
import { SceneObject } from "./SceneObject";

function Scene() {
  const objects = useSceneStore((s) => s.objects);
  const environment = useSceneStore((s) => s.environment);

  return (
    <>
      <Environment preset={environment as any} background blur={0.5} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />

      {objects.map((obj) => (
        <SceneObject key={obj.id} obj={obj} />
      ))}

      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.4}
        scale={10}
        blur={2}
      />
      <Grid
        infiniteGrid
        fadeDistance={20}
        fadeStrength={5}
        cellSize={0.5}
        cellThickness={0.5}
        sectionSize={2}
        sectionThickness={1}
        cellColor="#333"
        sectionColor="#555"
      />

      <OrbitControls makeDefault />
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport />
      </GizmoHelper>
    </>
  );
}

export function Canvas3D() {
  const selectObject = useSceneStore((s) => s.selectObject);

  return (
    <Canvas
      shadows
      camera={{ position: [5, 4, 5], fov: 50 }}
      onPointerMissed={() => selectObject(null)}
      className="!absolute inset-0"
    >
      <Scene />
    </Canvas>
  );
}
