import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
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

export function SceneObject({ obj }: { obj: SceneObjectType }) {
  const selectedId = useSceneStore((s) => s.selectedId);
  const selectObject = useSceneStore((s) => s.selectObject);
  const updateObject = useSceneStore((s) => s.updateObject);
  const transformMode = useSceneStore((s) => s.transformMode);
  const groupRef = useRef<THREE.Group>(null!);
  const isSelected = selectedId === obj.id;

  const inner = (
    <group
      ref={groupRef}
      position={obj.position}
      rotation={obj.rotation}
      scale={obj.scale}
      onClick={(e) => {
        e.stopPropagation();
        selectObject(obj.id);
      }}
    >
      {obj.animation === "float" ? (
        <Float speed={2} rotationIntensity={0.3} floatIntensity={1}>
          <ObjectMesh obj={obj} />
        </Float>
      ) : (
        <ObjectMesh obj={obj} />
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
