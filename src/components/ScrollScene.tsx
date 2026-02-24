import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Slide } from "../store/scene";
import { scrollOffsetRef, cameraMouseOffsetRef, isDraggingObjectRef } from "./Canvas3D";

export function ScrollScene({
  slides,
  onSlideChange,
}: {
  slides: Slide[];
  onSlideChange?: (index: number) => void;
}) {
  const { camera } = useThree();
  const targetVec = useRef(new THREE.Vector3());
  const lastIndex = useRef(-1);

  useFrame(() => {
    if (slides.length < 2) {
      const s = slides[0];
      if (s) {
        camera.position.set(...s.cameraPosition);
        camera.lookAt(...s.cameraTarget);
      }
      return;
    }

    const offset = scrollOffsetRef.current;
    const totalWeight = slides.reduce((sum, s) => sum + s.duration, 0);

    let accumulated = 0;
    let fromIndex = 0;
    let localT = 0;

    for (let i = 0; i < slides.length - 1; i++) {
      const segmentWeight = slides[i].duration;
      const segmentFraction = segmentWeight / totalWeight;
      if (offset <= accumulated + segmentFraction) {
        fromIndex = i;
        localT = (offset - accumulated) / segmentFraction;
        break;
      }
      accumulated += segmentFraction;
      fromIndex = i + 1;
      localT = 0;
    }

    const toIndex = Math.min(fromIndex + 1, slides.length - 1);
    const t = Math.max(0, Math.min(1, localT));
    const eased = t * t * (3 - 2 * t);

    const from = slides[fromIndex];
    const to = slides[toIndex];

    camera.position.lerpVectors(
      new THREE.Vector3(...from.cameraPosition),
      new THREE.Vector3(...to.cameraPosition),
      eased
    );

    targetVec.current.lerpVectors(
      new THREE.Vector3(...from.cameraTarget),
      new THREE.Vector3(...to.cameraTarget),
      eased
    );
    // Apply camera mouse offset
    camera.position.x += cameraMouseOffsetRef.current.x;
    camera.position.y += cameraMouseOffsetRef.current.y;

    camera.lookAt(targetVec.current);

    if (onSlideChange) {
      const index = Math.min(
        Math.floor(offset * slides.length),
        slides.length - 1
      );
      if (index !== lastIndex.current) {
        lastIndex.current = index;
        onSlideChange(index);
      }
    }
  });

  return null;
}
