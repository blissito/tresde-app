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
import * as THREE from "three";
import { clone as cloneWithSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

const _targetRotX = { current: 0 };
const _targetRotY = { current: 0 };
const FOLLOW_INTENSITY = 0.15;
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

function OrbitWrapper({ obj, children }: { obj: SceneObjectType; children: React.ReactNode }) {
  const orbitRef = useRef<THREE.Group>(null!);
  const radius = obj.orbitRadius ?? 2;
  const speed = obj.orbitSpeed ?? 1;

  useFrame((state) => {
    if (orbitRef.current) {
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

function ObjectMesh({ obj, materialRef }: { obj: SceneObjectType; materialRef?: React.RefObject<THREE.Material | null> }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (obj.animation === "rotate" && ref.current) {
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
    _targetRotY.current = pointer.x * FOLLOW_INTENSITY;
    _targetRotX.current = -pointer.y * FOLLOW_INTENSITY;
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
  const groupRef = useRef<THREE.Group>(null!);
  const followRef = useRef<THREE.Group>(null!);
  const materialRef = useRef<THREE.Material>(null);
  const isSelected = !embed && selectedId === obj.id;
  const [localHover, setLocalHover] = useState(false);

  const isHovered = embed && hasHoverConfig(obj) && (
    localHover ||
    (obj.hoverGroup ? hoveredGroup === obj.hoverGroup : false)
  );

  // Color lerp refs
  const baseColor = useRef(new THREE.Color());
  const hoverColorRef = useRef(new THREE.Color());
  const currentColor = useRef(new THREE.Color());

  useMouseFollow(embed);

  // Hover animation + mouse follow
  useFrame(() => {
    if (!embed) return;

    // Mouse follow
    if (followRef.current) {
      followRef.current.rotation.x = THREE.MathUtils.lerp(
        followRef.current.rotation.x,
        _targetRotX.current,
        FOLLOW_LERP
      );
      followRef.current.rotation.y = THREE.MathUtils.lerp(
        followRef.current.rotation.y,
        _targetRotY.current,
        FOLLOW_LERP
      );
    }

    // Hover transform lerp
    if (!hasHoverConfig(obj) || !groupRef.current) return;

    const g = groupRef.current;
    const t = isHovered ? 1 : 0;

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

  const handlePointerOver = embed && hasHoverConfig(obj) ? (e: any) => {
    e.stopPropagation();
    if (obj.hoverGroup) {
      setHoveredGroup(obj.hoverGroup);
    } else {
      setLocalHover(true);
    }
    document.body.style.cursor = 'pointer';
  } : undefined;

  const handlePointerOut = embed && hasHoverConfig(obj) ? () => {
    if (obj.hoverGroup) {
      setHoveredGroup(null);
    } else {
      setLocalHover(false);
    }
    document.body.style.cursor = 'auto';
  } : undefined;

  const objectMesh = <ObjectMesh obj={obj} materialRef={materialRef} />;

  const meshContent = obj.animation === "float" ? (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={1}>
      {objectMesh}
    </Float>
  ) : obj.animation === "orbit" ? (
    <OrbitWrapper obj={obj}>
      {objectMesh}
    </OrbitWrapper>
  ) : (
    objectMesh
  );

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
    >
      {embed ? (
        <group ref={followRef}>
          {meshContent}
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
