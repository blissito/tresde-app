import { create } from "zustand";

export type GeometryType =
  | "box"
  | "sphere"
  | "torus"
  | "roundedBox"
  | "dodecahedron"
  | "text3d";

export type MaterialType =
  | "standard"
  | "transmission"
  | "distort"
  | "wobble";

export type AnimationType = "none" | "float" | "rotate";

export interface SceneObject {
  id: string;
  name: string;
  geometry: GeometryType;
  material: MaterialType;
  animation: AnimationType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  metalness: number;
  roughness: number;
  text?: string;
  // transmission material
  transmission?: number;
  thickness?: number;
  // distort material
  distort?: number;
  speed?: number;
}

interface SceneState {
  objects: SceneObject[];
  selectedId: string | null;
  environment: string;
  transformMode: "translate" | "rotate" | "scale";
  addObject: (geometry: GeometryType) => void;
  removeObject: (id: string) => void;
  selectObject: (id: string | null) => void;
  updateObject: (id: string, updates: Partial<SceneObject>) => void;
  setEnvironment: (env: string) => void;
  setTransformMode: (mode: "translate" | "rotate" | "scale") => void;
  loadTemplate: (template: Omit<SceneObject, "id">[]) => void;
}

let counter = 0;
const names: Record<GeometryType, string> = {
  box: "Cubo",
  sphere: "Esfera",
  torus: "Torus",
  roundedBox: "RoundedBox",
  dodecahedron: "Dodecaedro",
  text3d: "Texto 3D",
};

export const useSceneStore = create<SceneState>((set) => ({
  objects: [],
  selectedId: null,
  environment: "city",
  transformMode: "translate",

  addObject: (geometry) => {
    const id = `obj-${++counter}`;
    const obj: SceneObject = {
      id,
      name: `${names[geometry]} ${counter}`,
      geometry,
      material: "standard",
      animation: "none",
      position: [Math.random() * 2 - 1, 0.5, Math.random() * 2 - 1],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: "#8b5cf6",
      metalness: 0.1,
      roughness: 0.4,
      transmission: 0.9,
      thickness: 0.5,
      distort: 0.4,
      speed: 2,
      text: "Hola",
    };
    set((s) => ({ objects: [...s.objects, obj], selectedId: id }));
  },

  removeObject: (id) =>
    set((s) => ({
      objects: s.objects.filter((o) => o.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  selectObject: (id) => set({ selectedId: id }),

  updateObject: (id, updates) =>
    set((s) => ({
      objects: s.objects.map((o) => (o.id === id ? { ...o, ...updates } : o)),
    })),

  setEnvironment: (environment) => set({ environment }),
  setTransformMode: (transformMode) => set({ transformMode }),

  loadTemplate: (template) => {
    const newObjects = template.map((t) => ({
      ...t,
      id: `obj-${++counter}`,
    }));
    set({ objects: newObjects, selectedId: null });
  },
}));
