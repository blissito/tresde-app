import { useRef, useState, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  TransformControls,
  Float,
  RoundedBox,
  Dodecahedron,
  MeshTransmissionMaterial,
  MeshDistortMaterial,
  MeshWobbleMaterial,
  Text3D,
  Center,
  useTexture,
  useGLTF,
  useAnimations,
} from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { useSceneStore, type SceneObject as SceneObjectType } from "../store/scene";
import { isDraggingObjectRef } from "./Canvas3D";
import * as THREE from "three";
import { clone as cloneWithSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

const _targetRotX = { current: 0 };
const _targetRotY = { current: 0 };
const FOLLOW_INTENSITY = 0.25;
const FOLLOW_LERP = 0.05;
const HOVER_LERP = 0.08;

function GeometryMesh({ obj }: { obj: SceneObjectType }) {
  switch (obj.geometry) {
    case "box":
      return <boxGeometry args={[1, 1, 1]} />;
    case "sphere":
      return <sphereGeometry args={[0.6, 32, 32]} />;
    case "torus":
      return <torusGeometry args={[0.5, 0.2, 16, 32]} />;
    case "dodecahedron":
      return <dodecahedronGeometry args={[0.6]} />;
    case "cylinder":
      return <cylinderGeometry args={[0.5, 0.5, 0.1, 64]} />;
    default:
      return <boxGeometry args={[1, 1, 1]} />;
  }
}

function TexturedMaterial({ obj, materialRef }: { obj: SceneObjectType; materialRef?: React.RefObject<THREE.Material | null> }) {
  const texture = useTexture(obj.textureUrl!);
  return (
    <meshStandardMaterial
      ref={materialRef as any}
      map={texture}
      color="#ffffff"
      metalness={obj.metalness}
      roughness={obj.roughness}
    />
  );
}

function MaterialComp({ obj, materialRef }: { obj: SceneObjectType; materialRef?: React.RefObject<THREE.Material | null> }) {
  if (obj.textureUrl) {
    return <TexturedMaterial obj={obj} materialRef={materialRef} />;
  }
  switch (obj.material) {
    case "transmission":
      return (
        <MeshTransmissionMaterial
          ref={materialRef as any}
          color={obj.color}
          transmission={obj.transmission ?? 0.9}
          thickness={obj.thickness ?? 0.5}
          roughness={obj.roughness}
          metalness={obj.metalness}
          backside
        />
      );
    case "distort":
      return (
        <MeshDistortMaterial
          ref={materialRef as any}
          color={obj.color}
          metalness={obj.metalness}
          roughness={obj.roughness}
          distort={obj.distort ?? 0.4}
          speed={obj.speed ?? 2}
        />
      );
    case "wobble":
      return (
        <MeshWobbleMaterial
          ref={materialRef as any}
          color={obj.color}
          metalness={obj.metalness}
          roughness={obj.roughness}
          factor={obj.distort ?? 0.4}
          speed={obj.speed ?? 2}
        />
      );
    default:
      return (
        <meshStandardMaterial
          ref={materialRef as any}
          color={obj.color}
          metalness={obj.metalness}
          roughness={obj.roughness}
        />
      );
  }
}

function OrbitWrapper({ obj, children, frozen }: { obj: SceneObjectType; children: React.ReactNode; frozen?: React.RefObject<boolean> }) {
  const orbitRef = useRef<THREE.Group>(null!);
  const radius = obj.orbitRadius ?? 2;
  const speed = obj.orbitSpeed ?? 1;
  const frozenPos = useRef<{ x: number; z: number } | null>(null);

  useFrame((state) => {
    if (orbitRef.current) {
      if (frozen?.current) {
        // Freeze at current position
        if (!frozenPos.current) {
          frozenPos.current = { x: orbitRef.current.position.x, z: orbitRef.current.position.z };
        }
        return;
      }
      frozenPos.current = null;
      const t = state.clock.elapsedTime * speed;
      orbitRef.current.position.x = Math.cos(t) * radius;
      orbitRef.current.position.z = Math.sin(t) * radius;
    }
  });

  return <group ref={orbitRef}>{children}</group>;
}

function GlbModel({ url, animationName }: { url: string; animationName?: string }) {
  const { scene, animations } = useGLTF(url);
  const cloned = useMemo(() => {
    const c = cloneWithSkeleton(scene);
    c.position.set(0, 0, 0);
    c.rotation.set(0, 0, 0);
    c.scale.set(1, 1, 1);
    return c;
  }, [scene]);
  const groupRef = useRef<THREE.Group>(null!);
  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    // Stop all current animations
    Object.values(actions).forEach((a) => a?.stop());

    // Determine which clip to play
    const clipName =
      animationName && animationName !== "__none__"
        ? animationName === "__first__"
          ? animations[0]?.name
          : animationName
        : animations.length > 0
          ? animations[0]?.name
          : undefined;

    if (clipName && actions[clipName]) {
      actions[clipName]!.reset().fadeIn(0.3).play();
    }
  }, [animationName, actions, animations]);

  return (
    <group ref={groupRef}>
      <primitive object={cloned} />
    </group>
  );
}

function ObjModel({ url }: { url: string }) {
  const obj = useLoader(OBJLoader, url);
  const cloned = useMemo(() => {
    const c = obj.clone();
    c.position.set(0, 0, 0);
    c.rotation.set(0, 0, 0);
    c.scale.set(1, 1, 1);
    return c;
  }, [obj]);
  return <primitive object={cloned} />;
}

function isObjUrl(url: string): boolean {
  if (url.startsWith("data:text/plain")) return true;
  const ext = url.split(".").pop()?.toLowerCase().split("?")[0];
  return ext === "obj";
}

function ModelComponent({ url, animationName }: { url: string; animationName?: string }) {
  if (isObjUrl(url)) return <ObjModel url={url} />;
  return <GlbModel url={url} animationName={animationName} />;
}

function ObjectMesh({ obj, materialRef, frozen }: { obj: SceneObjectType; materialRef?: React.RefObject<THREE.Material | null>; frozen?: React.RefObject<boolean> }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (obj.animation === "rotate" && ref.current && !frozen?.current) {
      ref.current.rotation.y += delta * 0.5;
    }
  });

  if (obj.geometry === "glb" && obj.glbUrl) {
    return (
      <group ref={ref as any}>
        <ModelComponent url={obj.glbUrl} animationName={obj.glbAnimation} />
      </group>
    );
  }

  if (obj.geometry === "roundedBox") {
    return (
      <RoundedBox ref={ref} args={[1, 1, 1]} radius={0.1} smoothness={4}>
        <MaterialComp obj={obj} materialRef={materialRef} />
      </RoundedBox>
    );
  }

  if (obj.geometry === "text3d") {
    return (
      <Center ref={ref as any}>
        <Text3D
          font="/fonts/inter_bold.json"
          size={0.5}
          height={0.1}
          curveSegments={12}
        >
          {obj.text || "Hola"}
          <MaterialComp obj={obj} materialRef={materialRef} />
        </Text3D>
      </Center>
    );
  }

  return (
    <mesh ref={ref} castShadow receiveShadow>
      <GeometryMesh obj={obj} />
      <MaterialComp obj={obj} materialRef={materialRef} />
    </mesh>
  );
}

function useMouseFollow(embed?: boolean) {
  const { pointer } = useThree();

  useFrame(() => {
    if (!embed) return;
    _targetRotY.current = -pointer.x * FOLLOW_INTENSITY;
    _targetRotX.current = pointer.y * FOLLOW_INTENSITY;
  });
}

const hasHoverConfig = (obj: SceneObjectType) =>
  obj.hoverPosition || obj.hoverRotation || obj.hoverScale || obj.hoverColor;

export function SceneObject({ obj, embed }: { obj: SceneObjectType; embed?: boolean }) {
  const selectedId = useSceneStore((s) => s.selectedId);
  const selectObject = useSceneStore((s) => s.selectObject);
  const updateObject = useSceneStore((s) => s.updateObject);
  const duplicateObject = useSceneStore((s) => s.duplicateObject);
  const transformMode = useSceneStore((s) => s.transformMode);
  const hoveredGroup = useSceneStore((s) => s.hoveredGroup);
  const setHoveredGroup = useSceneStore((s) => s.setHoveredGroup);
  const { camera, pointer, size } = useThree();
  const groupRef = useRef<THREE.Group>(null!);
  const followRef = useRef<THREE.Group>(null!);
  const interactionRef = useRef<THREE.Group>(null!); // parallax + drag combined
  const materialRef = useRef<THREE.Material>(null);
  const isSelected = !embed && selectedId === obj.id;
  const [localHover, setLocalHover] = useState(false);

  // Drag: simple screen-space pixel accumulation
  const isDragging = useRef(false);
  const dragPixels = useRef({ x: 0, y: 0 }); // accumulated px from movementX/Y
  const dragWorld = useRef(new THREE.Vector3(0, 0, 0)); // converted to world units

  const isHovered = embed && hasHoverConfig(obj) && (
    localHover ||
    (obj.hoverGroup ? hoveredGroup === obj.hoverGroup : false)
  );

  // Color lerp refs
  const baseColor = useRef(new THREE.Color());
  const hoverColorRef = useRef(new THREE.Color());
  const currentColor = useRef(new THREE.Color());

  useMouseFollow(embed);

  // All embed-mode per-frame logic
  useFrame(() => {
    if (!embed) return;

    const dragging = isDragging.current;

    // Mouse follow (rotation) — freeze during drag
    if (followRef.current) {
      const targetRX = dragging ? 0 : _targetRotX.current;
      const targetRY = dragging ? 0 : _targetRotY.current;
      followRef.current.rotation.x = THREE.MathUtils.lerp(followRef.current.rotation.x, targetRX, FOLLOW_LERP);
      followRef.current.rotation.y = THREE.MathUtils.lerp(followRef.current.rotation.y, targetRY, FOLLOW_LERP);
    }

    // Interaction group: parallax OR drag (drag takes priority)
    if (interactionRef.current) {
      if (dragging) {
        // Convert accumulated pixel drag to world units.
        // Scale factor: how many world units per pixel at object distance.
        const objPos = groupRef.current?.position || new THREE.Vector3();
        const dist = camera.position.distanceTo(objPos);
        const vFov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
        const worldPerPx = (2 * dist * Math.tan(vFov / 2)) / size.height;

        dragWorld.current.set(
          dragPixels.current.x * worldPerPx,
          -dragPixels.current.y * worldPerPx, // screen Y is inverted
          0
        );
        // Transform from camera-local XY to world XY
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());
        const worldOffset = right.multiplyScalar(dragWorld.current.x)
          .add(up.multiplyScalar(dragWorld.current.y));

        interactionRef.current.position.lerp(worldOffset, 0.3);
      } else {
        // Spring back OR parallax
        const pIntensity = obj.parallaxIntensity ?? 0;
        let targetX = 0;
        let targetY = 0;

        if (pIntensity > 0) {
          const dist = camera.position.distanceTo(groupRef.current?.position || new THREE.Vector3());
          const factor = Math.max(0.3, 3 / Math.max(dist, 0.5));
          targetX = pointer.x * factor * pIntensity * 1.5;
          targetY = pointer.y * factor * pIntensity * 1.5;
        }

        interactionRef.current.position.x = THREE.MathUtils.lerp(interactionRef.current.position.x, targetX, 0.06);
        interactionRef.current.position.y = THREE.MathUtils.lerp(interactionRef.current.position.y, targetY, 0.06);
        interactionRef.current.position.z = THREE.MathUtils.lerp(interactionRef.current.position.z, 0, 0.06);
      }
    }

    // Hover transform lerp
    if (!hasHoverConfig(obj) || !groupRef.current) return;

    const g = groupRef.current;

    if (obj.hoverPosition) {
      g.position.x = THREE.MathUtils.lerp(g.position.x, isHovered ? obj.hoverPosition[0] : obj.position[0], HOVER_LERP);
      g.position.y = THREE.MathUtils.lerp(g.position.y, isHovered ? obj.hoverPosition[1] : obj.position[1], HOVER_LERP);
      g.position.z = THREE.MathUtils.lerp(g.position.z, isHovered ? obj.hoverPosition[2] : obj.position[2], HOVER_LERP);
    }

    if (obj.hoverRotation) {
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, isHovered ? obj.hoverRotation[0] : obj.rotation[0], HOVER_LERP);
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, isHovered ? obj.hoverRotation[1] : obj.rotation[1], HOVER_LERP);
      g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, isHovered ? obj.hoverRotation[2] : obj.rotation[2], HOVER_LERP);
    }

    if (obj.hoverScale) {
      g.scale.x = THREE.MathUtils.lerp(g.scale.x, isHovered ? obj.hoverScale[0] : obj.scale[0], HOVER_LERP);
      g.scale.y = THREE.MathUtils.lerp(g.scale.y, isHovered ? obj.hoverScale[1] : obj.scale[1], HOVER_LERP);
      g.scale.z = THREE.MathUtils.lerp(g.scale.z, isHovered ? obj.hoverScale[2] : obj.scale[2], HOVER_LERP);
    }

    if (obj.hoverColor && materialRef.current && 'color' in materialRef.current) {
      baseColor.current.set(obj.color);
      hoverColorRef.current.set(obj.hoverColor);
      const mat = materialRef.current as THREE.MeshStandardMaterial;
      currentColor.current.copy(mat.color);
      const target = isHovered ? hoverColorRef.current : baseColor.current;
      currentColor.current.lerp(target, HOVER_LERP);
      mat.color.copy(currentColor.current);
    }
  });

  // --- Drag handlers: simple movementX/Y accumulation ---
  const handleDragPointerDown = embed && obj.draggable ? (e: any) => {
    e.stopPropagation();
    isDragging.current = true;
    isDraggingObjectRef.current = true;
    dragPixels.current = { x: 0, y: 0 };
    (e.target as any)?.setPointerCapture?.(e.pointerId);
    document.body.style.cursor = 'grabbing';
  } : undefined;

  const handleDragPointerMove = embed && obj.draggable ? (e: any) => {
    if (!isDragging.current) return;
    e.stopPropagation();
    // Use native movementX/Y — always correct, no raycasting needed
    dragPixels.current.x += e.movementX;
    dragPixels.current.y += e.movementY;
  } : undefined;

  const handleDragPointerUp = embed && obj.draggable ? (e: any) => {
    isDragging.current = false;
    isDraggingObjectRef.current = false;
    dragPixels.current = { x: 0, y: 0 };
    (e.target as any)?.releasePointerCapture?.(e.pointerId);
    document.body.style.cursor = 'auto';
  } : undefined;

  const handlePointerOver = embed && (hasHoverConfig(obj) || obj.draggable) ? (e: any) => {
    e.stopPropagation();
    if (hasHoverConfig(obj)) {
      if (obj.hoverGroup) {
        setHoveredGroup(obj.hoverGroup);
      } else {
        setLocalHover(true);
      }
    }
    document.body.style.cursor = obj.draggable ? 'grab' : 'pointer';
  } : undefined;

  const handlePointerOut = embed && (hasHoverConfig(obj) || obj.draggable) ? () => {
    if (hasHoverConfig(obj)) {
      if (obj.hoverGroup) {
        setHoveredGroup(null);
      } else {
        setLocalHover(false);
      }
    }
    if (!isDragging.current) document.body.style.cursor = 'auto';
  } : undefined;

  const frozen = embed ? isDragging : undefined;
  const objectMesh = <ObjectMesh obj={obj} materialRef={materialRef} frozen={frozen} />;

  const meshContent = obj.animation === "float" ? (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={1}>
      {objectMesh}
    </Float>
  ) : obj.animation === "orbit" ? (
    <OrbitWrapper obj={obj} frozen={frozen}>
      {objectMesh}
    </OrbitWrapper>
  ) : (
    objectMesh
  );

  // Embed hierarchy: groupRef (base+hover) → interactionRef (parallax+drag) → followRef (mouse rotation) → mesh
  const inner = (
    <group
      ref={groupRef}
      position={obj.position}
      rotation={obj.rotation}
      scale={obj.scale}
      onClick={embed ? undefined : (e) => {
        e.stopPropagation();
        if (e.altKey) {
          duplicateObject(obj.id);
        } else {
          selectObject(obj.id);
        }
      }}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerDown={handleDragPointerDown}
      onPointerMove={handleDragPointerMove}
      onPointerUp={handleDragPointerUp}
    >
      {embed ? (
        <group ref={interactionRef}>
          <group ref={followRef}>
            {meshContent}
          </group>
        </group>
      ) : (
        meshContent
      )}
    </group>
  );

  if (!isSelected) return inner;

  return (
    <>
      {inner}
      <TransformControls
        object={groupRef.current || undefined}
        mode={transformMode}
        onObjectChange={() => {
          if (!groupRef.current) return;
          const p = groupRef.current.position;
          const r = groupRef.current.rotation;
          const s = groupRef.current.scale;
          updateObject(obj.id, {
            position: [p.x, p.y, p.z],
            rotation: [r.x, r.y, r.z],
            scale: [s.x, s.y, s.z],
          });
        }}
      />
    </>
  );
}
