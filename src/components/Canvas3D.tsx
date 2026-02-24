import { Canvas, useThree, useFrame } from "@react-three/fiber";
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
import { ScrollScene } from "./ScrollScene";
import { useRef, useState, useCallback, useEffect } from "react";
import * as THREE from "three";

// Global ref to read camera state from outside R3F
const _initialCam = useSceneStore.getState();
export const cameraStateRef: { current: { position: [number, number, number]; target: [number, number, number] } } = {
  current: { position: _initialCam.cameraPosition, target: _initialCam.cameraTarget },
};

// Ref shared between OrbitControls and CameraTracker
export const orbitControlsRef = { current: null as any };

function CameraController() {
  const flyToSlideId = useSceneStore((s) => s.flyToSlideId);
  const clearFlyTo = useSceneStore((s) => s.clearFlyTo);
  const slides = useSceneStore((s) => s.slides);
  const mode = useRef<'orbit' | 'flying'>('orbit');
  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());
  // Reusable vectors to avoid allocations in useFrame
  const _dir = useRef(new THREE.Vector3());
  const _lookAt = useRef(new THREE.Vector3());
  const _saveCounter = useRef(0);

  // Restore saved orbit target on mount
  const _restored = useRef(false);
  useEffect(() => {
    if (_restored.current) return;
    const savedTarget = useSceneStore.getState().cameraTarget;
    const check = () => {
      const ctrl = orbitControlsRef.current;
      if (ctrl?.target) {
        ctrl.target.set(...savedTarget);
        ctrl.update();
        _restored.current = true;
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  }, []);

  // Start flying when a slide is clicked
  useEffect(() => {
    if (flyToSlideId) {
      const slide = slides.find((s) => s.id === flyToSlideId);
      if (slide) {
        targetPos.current.set(...slide.cameraPosition);
        targetLook.current.set(...slide.cameraTarget);
        const ctrl = orbitControlsRef.current;
        if (ctrl) ctrl.enabled = false;
        mode.current = 'flying';
      }
      clearFlyTo();
    }
  }, [flyToSlideId, slides, clearFlyTo]);

  useFrame((state) => {
    // Grab controls ref once available
    if (!orbitControlsRef.current && state.controls) {
      orbitControlsRef.current = state.controls;
    }

    const { camera } = state;
    const ctrl = orbitControlsRef.current;

    if (mode.current === 'flying') {
      // Lerp position and target WITHOUT calling ctrl.update()
      camera.position.lerp(targetPos.current, 0.08);
      if (ctrl?.target) {
        ctrl.target.lerp(targetLook.current, 0.08);
      }
      // Make camera look at the interpolated target
      camera.lookAt(ctrl?.target ?? targetLook.current);

      const dist = camera.position.distanceTo(targetPos.current);
      if (dist < 0.01) {
        // Snap to final values
        camera.position.copy(targetPos.current);
        if (ctrl?.target) {
          ctrl.target.copy(targetLook.current);
        }
        // Re-enable orbit and sync its internal spherical state once
        if (ctrl) {
          ctrl.enabled = true;
          ctrl.update();
        }
        mode.current = 'orbit';
      }
    }

    // Always track camera state for slide captures
    const pos: [number, number, number] = [camera.position.x, camera.position.y, camera.position.z];
    camera.getWorldDirection(_dir.current);
    const dist = ctrl?.target ? camera.position.distanceTo(ctrl.target) : 5;
    _lookAt.current.copy(camera.position).add(_dir.current.multiplyScalar(dist));
    const tgt: [number, number, number] = [_lookAt.current.x, _lookAt.current.y, _lookAt.current.z];

    cameraStateRef.current.position = pos;
    cameraStateRef.current.target = tgt;

    // Persist to store every ~60 frames
    _saveCounter.current++;
    if (_saveCounter.current >= 60) {
      _saveCounter.current = 0;
      useSceneStore.getState().setCameraState(pos, tgt);
    }
  });

  return null;
}

function DropPlane() {
  return (
    <mesh visible={false} rotation-x={-Math.PI / 2} position={[0, 0.5, 0]}>
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial />
    </mesh>
  );
}

function PreviewCameraSetup() {
  const savedTarget = useSceneStore((s) => s.cameraTarget);
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    const check = () => {
      const ctrl = orbitControlsRef.current;
      if (ctrl?.target) {
        ctrl.target.set(...savedTarget);
        ctrl.update();
        done.current = true;
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  }, []);
  return null;
}

function Scene({ embed, preserveCamera, onSlideChange }: { embed?: boolean; preserveCamera?: boolean; onSlideChange?: (index: number) => void }) {
  const objects = useSceneStore((s) => s.objects);
  const environment = useSceneStore((s) => s.environment);
  const bgColor = useSceneStore((s) => s.bgColor);
  const slides = useSceneStore((s) => s.slides);
  const useScrollMode = embed && slides.length >= 2;

  return (
    <>
      <Environment
        preset={environment as any}
        background={!embed}
        blur={0.5}
      />
      {embed && <color attach="background" args={[bgColor]} />}

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

      {!useScrollMode && (
        <OrbitControls makeDefault enableZoom={!embed} enablePan={!embed} />
      )}

      {useScrollMode && <ScrollScene slides={slides} onSlideChange={onSlideChange} />}

      {!embed && <CameraController />}
      {embed && preserveCamera && !useScrollMode && <PreviewCameraSetup />}
    </>
  );
}

// Shared scroll offset for wheel-driven camera animation
export const scrollOffsetRef = { current: 0 };

export function Canvas3D({ embed, preserveCamera, onSlideChange }: { embed?: boolean; preserveCamera?: boolean; onSlideChange?: (index: number) => void }) {
  const selectObject = useSceneStore((s) => s.selectObject);
  const addObject = useSceneStore((s) => s.addObject);
  const slides = useSceneStore((s) => s.slides);
  const savedCameraPos = useSceneStore((s) => s.cameraPosition);
  const savedCameraTarget = useSceneStore((s) => s.cameraTarget);
  const useScrollMode = embed && slides.length >= 2;
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

  // Wheel-driven scroll for embed mode (non-passive to allow preventDefault)
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!useScrollMode) return;
    const el = wrapperRef.current;
    if (!el) return;

    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const pages = slides.length;
      const delta = e.deltaY / (window.innerHeight * pages);
      scrollOffsetRef.current = Math.max(0, Math.min(1, scrollOffsetRef.current + delta));
    };

    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [useScrollMode, slides.length]);

  return (
    <div
      ref={wrapperRef}
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
          position: (embed && !preserveCamera) ? [0, 0.5, 8] : savedCameraPos,
          fov: embed ? 60 : 50,
        }}
        onPointerMissed={() => !embed && selectObject(null)}
        className="!absolute inset-0"
      >
        <Scene embed={embed} preserveCamera={preserveCamera} onSlideChange={onSlideChange} />
      </Canvas>
    </div>
  );
}
