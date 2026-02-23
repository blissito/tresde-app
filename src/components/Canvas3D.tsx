import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  Environment,
  ContactShadows,
  GizmoHelper,
  GizmoViewport,
} from "@react-three/drei";
import { useSceneStore, type GeometryType } from "../store/scene";
import { SceneObject } from "./SceneObject";
import { useRef, useState, useCallback } from "react";
import * as THREE from "three";

function DropPlane() {
  return (
    <mesh visible={false} rotation-x={-Math.PI / 2} position={[0, 0.5, 0]}>
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial />
    </mesh>
  );
}

function Scene({ embed }: { embed?: boolean }) {
  const objects = useSceneStore((s) => s.objects);
  const environment = useSceneStore((s) => s.environment);

  return (
    <>
      <Environment
        preset={environment as any}
        background={!embed}
        blur={0.5}
      />
      {embed && <color attach="background" args={["#000000"]} />}

      <ambientLight intensity={embed ? 0.15 : 0.3} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={embed ? 0.6 : 0.8}
        castShadow
      />
      {embed && (
        <>
          <pointLight position={[-4, 3, 2]} intensity={0.4} color="#818cf8" />
          <pointLight position={[4, -2, 3]} intensity={0.3} color="#f472b6" />
        </>
      )}

      {objects.map((obj) => (
        <SceneObject key={obj.id} obj={obj} embed={embed} />
      ))}

      {!embed && (
        <ContactShadows
          position={[0, -0.01, 0]}
          opacity={0.4}
          scale={10}
          blur={2}
        />
      )}

      {!embed && (
        <>
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
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport />
          </GizmoHelper>
        </>
      )}

      <DropPlane />
      <OrbitControls makeDefault enableZoom={!embed} enablePan={!embed} />
    </>
  );
}

export function Canvas3D({ embed }: { embed?: boolean }) {
  const selectObject = useSceneStore((s) => s.selectObject);
  const addObject = useSceneStore((s) => s.addObject);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/tresde-geometry")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      const geometry = e.dataTransfer.getData("application/tresde-geometry") as GeometryType;
      if (!geometry) return;

      const canvas = canvasRef.current;
      if (!canvas) {
        addObject(geometry);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Raycast against y=0.5 plane
      const raycaster = new THREE.Raycaster();
      const camera = (canvas as any).__r3f?.store?.getState()?.camera;
      if (!camera) {
        addObject(geometry);
        return;
      }

      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersection);

      if (intersection) {
        addObject(geometry, [
          Math.round(intersection.x * 2) / 2,
          0.5,
          Math.round(intersection.z * 2) / 2,
        ]);
      } else {
        addObject(geometry);
      }
    },
    [addObject]
  );

  return (
    <div
      className="absolute inset-0"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div className="absolute inset-0 border-2 border-violet-500 rounded-lg pointer-events-none z-10 bg-violet-500/5" />
      )}
      <Canvas
        ref={canvasRef}
        shadows
        camera={{
          position: embed ? [0, 0.5, 8] : [5, 4, 5],
          fov: embed ? 60 : 50,
        }}
        onPointerMissed={() => !embed && selectObject(null)}
        className="!absolute inset-0"
      >
        <Scene embed={embed} />
      </Canvas>
    </div>
  );
}
