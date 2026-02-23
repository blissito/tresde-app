import { useRef } from "react";
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
} from "@react-three/drei";
import { useSceneStore, type SceneObject as SceneObjectType } from "../store/scene";
import * as THREE from "three";

const _targetRotX = { current: 0 };
const _targetRotY = { current: 0 };
const FOLLOW_INTENSITY = 0.15; // máxima rotación en radianes (~8.5°)
const FOLLOW_LERP = 0.05; // suavidad del seguimiento

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
    default:
      return <boxGeometry args={[1, 1, 1]} />;
  }
}

function MaterialComp({ obj }: { obj: SceneObjectType }) {
  switch (obj.material) {
    case "transmission":
      return (
        <MeshTransmissionMaterial
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
          color={obj.color}
          metalness={obj.metalness}
          roughness={obj.roughness}
        />
      );
  }
}

function ObjectMesh({ obj }: { obj: SceneObjectType }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (obj.animation === "rotate" && ref.current) {
      ref.current.rotation.y += delta * 0.5;
    }
  });

  if (obj.geometry === "roundedBox") {
    return (
      <RoundedBox ref={ref} args={[1, 1, 1]} radius={0.1} smoothness={4}>
        <MaterialComp obj={obj} />
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
          <MaterialComp obj={obj} />
        </Text3D>
      </Center>
    );
  }

  return (
    <mesh ref={ref} castShadow receiveShadow>
      <GeometryMesh obj={obj} />
      <MaterialComp obj={obj} />
    </mesh>
  );
}

/** Hook que trackea el mouse normalizado (-1 a 1) y lo convierte en rotación target */
function useMouseFollow(embed?: boolean) {
  const { pointer } = useThree();

  useFrame(() => {
    if (!embed) return;
    // pointer.x y pointer.y van de -1 a 1
    _targetRotY.current = pointer.x * FOLLOW_INTENSITY;
    _targetRotX.current = -pointer.y * FOLLOW_INTENSITY;
  });
}

export function SceneObject({ obj, embed }: { obj: SceneObjectType; embed?: boolean }) {
  const selectedId = useSceneStore((s) => s.selectedId);
  const selectObject = useSceneStore((s) => s.selectObject);
  const updateObject = useSceneStore((s) => s.updateObject);
  const transformMode = useSceneStore((s) => s.transformMode);
  const groupRef = useRef<THREE.Group>(null!);
  const followRef = useRef<THREE.Group>(null!);
  const isSelected = !embed && selectedId === obj.id;

  // Actualiza target del mouse (solo corre en el primer SceneObject, los demás leen el valor)
  useMouseFollow(embed);

  // Aplica rotación suave hacia el mouse en embed mode
  useFrame(() => {
    if (!embed || !followRef.current) return;
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
  });

  const meshContent = obj.animation === "float" ? (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={1}>
      <ObjectMesh obj={obj} />
    </Float>
  ) : (
    <ObjectMesh obj={obj} />
  );

  const inner = (
    <group
      ref={groupRef}
      position={obj.position}
      rotation={obj.rotation}
      scale={obj.scale}
      onClick={embed ? undefined : (e) => {
        e.stopPropagation();
        selectObject(obj.id);
      }}
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
