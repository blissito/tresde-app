import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type { SceneObject, Slide } from "../store/scene";

export interface SharedScene {
  objects: SceneObject[];
  environment: string;
  bgColor: string;
  slides: Slide[];
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
}

export function encodeScene(state: SharedScene): string {
  const stripped = {
    ...state,
    objects: state.objects.map(({ textureUrl, ...rest }) => rest),
  };
  const json = JSON.stringify(stripped);
  const compressed = compressToEncodedURIComponent(json);
  return `${window.location.origin}/embed#scene=${compressed}`;
}

export function decodeScene(hash: string): SharedScene | null {
  const prefix = "#scene=";
  if (!hash.startsWith(prefix)) return null;
  const compressed = hash.slice(prefix.length);
  const json = decompressFromEncodedURIComponent(compressed);
  if (!json) return null;
  try {
    return JSON.parse(json) as SharedScene;
  } catch {
    return null;
  }
}
