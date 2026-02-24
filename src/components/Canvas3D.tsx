import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  Environment,
  ContactShadows,
  GizmoHelper,
  GizmoViewport,
} from "@react-three/drei";
import { useSceneStore, type GeometryType, type CameraKeyframe } from "../store/scene";
import { SceneObject } from "./SceneObject";
import { ScrollScene } from "./ScrollScene";
import { useRef, useState, useCallback, useEffect } from "react";
import * as THREE from "three";

// Shared ref: is an object being dragged? Disables scroll/orbit during drag
export const isDraggingObjectRef = { current: false };

// Shared ref: camera mouse offset for CameraMouseFollow
export const cameraMouseOffsetRef = { current: { x: 0, y: 0 } };

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


// Only computes camera offset ref for scroll mode. Non-scroll mode doesn't
// touch camera (OrbitControls owns it).
function CameraMouseFollow() {
  const { pointer } = useThree();
  const intensity = useSceneStore((s) => s.cameraFollowIntensity);

  useFrame(() => {
    const targetX = pointer.x * intensity * 0.3;
    const targetY = pointer.y * intensity * 0.3;
    cameraMouseOffsetRef.current.x = THREE.MathUtils.lerp(cameraMouseOffsetRef.current.x, targetX, 0.04);
    cameraMouseOffsetRef.current.y = THREE.MathUtils.lerp(cameraMouseOffsetRef.current.y, targetY, 0.04);
  });

  return null;
}

// Ramer-Douglas-Peucker for 6D points (position + target)
function rdpSimplify(points: CameraKeyframe[], epsilon: number): CameraKeyframe[] {
  if (points.length <= 2) return points;

  const dist6D = (p: CameraKeyframe, a: CameraKeyframe, b: CameraKeyframe) => {
    const tRange = b.time - a.time;
    if (tRange === 0) return 0;
    const t = (p.time - a.time) / tRange;
    let sum = 0;
    for (let i = 0; i < 3; i++) {
      const ip = a.position[i] + t * (b.position[i] - a.position[i]);
      const it = a.target[i] + t * (b.target[i] - a.target[i]);
      sum += (p.position[i] - ip) ** 2 + (p.target[i] - it) ** 2;
    }
    return Math.sqrt(sum);
  };

  let maxDist = 0, maxIdx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = dist6D(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }

  if (maxDist > epsilon) {
    const left = rdpSimplify(points.slice(0, maxIdx + 1), epsilon);
    const right = rdpSimplify(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0], points[points.length - 1]];
}

function CameraRecorder({ recording, onStop }: { recording: boolean; onStop: (keyframes: CameraKeyframe[]) => void }) {
  const frames = useRef<CameraKeyframe[]>([]);
  const startTime = useRef(0);
  const frameCount = useRef(0);
  const wasRecording = useRef(false);

  useFrame((state) => {
    if (recording) {
      if (!wasRecording.current) {
        // Just started recording
        frames.current = [];
        startTime.current = state.clock.elapsedTime;
        frameCount.current = 0;
        wasRecording.current = true;
      }

      frameCount.current++;
      // Sample every 2 frames (~30fps)
      if (frameCount.current % 2 !== 0) return;

      const time = state.clock.elapsedTime - startTime.current;
      const { camera } = state;
      const ctrl = orbitControlsRef.current;
      const target = ctrl?.target || new THREE.Vector3();

      frames.current.push({
        time,
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [target.x, target.y, target.z],
      });
    } else if (wasRecording.current) {
      wasRecording.current = false;
      if (frames.current.length > 2) {
        const simplified = rdpSimplify(frames.current, 0.05);
        onStop(simplified);
      }
      frames.current = [];
    }
  });

  return null;
}

export function CameraPlayback({ keyframes, loop }: { keyframes: CameraKeyframe[]; loop?: boolean }) {
  const { camera } = useThree();
  const startTime = useRef(-1);

  useFrame((state) => {
    if (keyframes.length < 2) return;

    if (startTime.current < 0) startTime.current = state.clock.elapsedTime;

    let t = state.clock.elapsedTime - startTime.current;
    const duration = keyframes[keyframes.length - 1].time;

    if (duration <= 0) return;

    if (loop) t = t % duration;
    else t = Math.min(t, duration);

    // Find surrounding keyframes
    let fromIdx = 0;
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (keyframes[i + 1].time >= t) { fromIdx = i; break; }
      fromIdx = i;
    }
    const toIdx = Math.min(fromIdx + 1, keyframes.length - 1);

    const from = keyframes[fromIdx];
    const to = keyframes[toIdx];
    const segDur = to.time - from.time;
    const localT = segDur > 0 ? (t - from.time) / segDur : 0;
    const eased = localT * localT * (3 - 2 * localT); // smoothstep

    const pos = new THREE.Vector3().lerpVectors(
      new THREE.Vector3(...from.position),
      new THREE.Vector3(...to.position),
      eased
    );
    const tgt = new THREE.Vector3().lerpVectors(
      new THREE.Vector3(...from.target),
      new THREE.Vector3(...to.target),
      eased
    );

    camera.position.copy(pos);
    camera.lookAt(tgt);

    // Sync orbit controls target
    const ctrl = orbitControlsRef.current;
    if (ctrl?.target) {
      ctrl.target.copy(tgt);
    }
  });

  return null;
}

function Scene({ embed, preserveCamera, onSlideChange, isRecording, isPlaying }: { embed?: boolean; preserveCamera?: boolean; onSlideChange?: (index: number) => void; isRecording?: boolean; isPlaying?: boolean }) {
  const objects = useSceneStore((s) => s.objects);
  const environment = useSceneStore((s) => s.environment);
  const bgColor = useSceneStore((s) => s.bgColor);
  const slides = useSceneStore((s) => s.slides);
  const savedTarget = useSceneStore((s) => s.cameraTarget);
  const cameraRecording = useSceneStore((s) => s.cameraRecording);
  const setCameraRecording = useSceneStore((s) => s.setCameraRecording);
  const useScrollMode = embed && slides.length >= 2 && !isPlaying;

  return (
    <>
      <Environment
        preset={environment as any}
        background
        blur={0.5}
      />

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

      {!useScrollMode && !isPlaying && (
        <OrbitControls
          makeDefault
          enableZoom={!embed || !!preserveCamera}
          enablePan={!embed || !!preserveCamera}
          target={preserveCamera ? savedTarget : undefined}
        />
      )}

      {useScrollMode && <ScrollScene slides={slides} onSlideChange={onSlideChange} />}

      {useScrollMode && <CameraMouseFollow />}

      {!embed && <CameraController />}

      {embed && isRecording !== undefined && (
        <CameraRecorder recording={!!isRecording} onStop={(kf) => setCameraRecording(kf)} />
      )}

      {isPlaying && cameraRecording.length >= 2 && (
        <CameraPlayback keyframes={cameraRecording} loop />
      )}
    </>
  );
}

// Shared scroll offset for wheel-driven camera animation
export const scrollOffsetRef = { current: 0 };

export function Canvas3D({ embed, preserveCamera, onSlideChange, isRecording, isPlaying }: { embed?: boolean; preserveCamera?: boolean; onSlideChange?: (index: number) => void; isRecording?: boolean; isPlaying?: boolean }) {
  const selectObject = useSceneStore((s) => s.selectObject);
  const addObject = useSceneStore((s) => s.addObject);
  const slides = useSceneStore((s) => s.slides);
  const savedCameraPos = useSceneStore((s) => s.cameraPosition);
  const savedCameraTarget = useSceneStore((s) => s.cameraTarget);
  const useScrollMode = embed && slides.length >= 2;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/tresde-geometry") || e.dataTransfer.types.includes("application/tresde-glb")) {
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

      const glbUrl = e.dataTransfer.getData("application/tresde-glb");
      const glbName = e.dataTransfer.getData("application/tresde-glb-name");
      const geometry = (glbUrl ? "glb" : e.dataTransfer.getData("application/tresde-geometry")) as GeometryType;
      if (!geometry) return;
      const glbOpts = glbUrl ? { glbUrl, name: glbName || "GLB" } : undefined;

      const canvas = canvasRef.current;
      if (!canvas) {
        addObject(geometry, undefined, glbOpts);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Raycast against y=0.5 plane
      const raycaster = new THREE.Raycaster();
      const camera = (canvas as any).__r3f?.store?.getState()?.camera;
      if (!camera) {
        addObject(geometry, undefined, glbOpts);
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
        ], glbOpts);
      } else {
        addObject(geometry, undefined, glbOpts);
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
      if (isDraggingObjectRef.current) return;
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
          fov: preserveCamera ? 50 : (embed ? 60 : 50),
        }}
        onPointerMissed={() => !embed && selectObject(null)}
        className="!absolute inset-0"
      >
        <Scene embed={embed} preserveCamera={preserveCamera} onSlideChange={onSlideChange} isRecording={isRecording} isPlaying={isPlaying} />
      </Canvas>
    </div>
  );
}
