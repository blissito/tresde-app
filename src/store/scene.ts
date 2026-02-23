import { create } from "zustand";
import { persist } from "zustand/middleware";

export type GeometryType =
  | "box"
  | "sphere"
  | "torus"
  | "roundedBox"
  | "dodecahedron"
  | "text3d"
  | "cylinder";

export type MaterialType =
  | "standard"
  | "transmission"
  | "distort"
  | "wobble";

export type AnimationType = "none" | "float" | "rotate" | "orbit";

export type HoverPreset = "none" | "lift" | "grow" | "spin" | "tilt" | "glow" | "explode";

export interface Slide {
  id: string;
  name: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  text?: string;
  duration: number;
}

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
  // hover interactions
  hoverPreset?: HoverPreset;
  hoverGroup?: string;
  hoverPosition?: [number, number, number];
  hoverRotation?: [number, number, number];
  hoverScale?: [number, number, number];
  hoverColor?: string;
  textureUrl?: string;
  orbitRadius?: number;
  orbitSpeed?: number;
}

interface SceneState {
  objects: SceneObject[];
  selectedId: string | null;
  environment: string;
  bgColor: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  transformMode: "translate" | "rotate" | "scale";
  setBgColor: (color: string) => void;
  setCameraState: (position: [number, number, number], target: [number, number, number]) => void;
  slides: Slide[];
  activeSlideId: string | null;
  flyToSlideId: string | null;
  addObject: (geometry: GeometryType, position?: [number, number, number]) => void;
  duplicateObject: (id: string) => void;
  removeObject: (id: string) => void;
  selectObject: (id: string | null) => void;
  updateObject: (id: string, updates: Partial<SceneObject>) => void;
  setEnvironment: (env: string) => void;
  setTransformMode: (mode: "translate" | "rotate" | "scale") => void;
  loadTemplate: (template: Omit<SceneObject, "id">[]) => void;
  addSlide: (cameraPosition: [number, number, number], cameraTarget: [number, number, number]) => void;
  removeSlide: (id: string) => void;
  updateSlide: (id: string, updates: Partial<Slide>) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  setActiveSlide: (id: string | null) => void;
  flyToSlide: (id: string) => void;
  clearFlyTo: () => void;
  hoveredGroup: string | null;
  setHoveredGroup: (group: string | null) => void;
  loadScene: (data: { objects: SceneObject[]; environment: string; bgColor: string; slides: Slide[]; cameraPosition: [number, number, number]; cameraTarget: [number, number, number] }) => void;
}

let counter = 0;
let slideCounter = 0;

// Restore counters from persisted state to avoid ID collisions after reload
try {
  const persisted = JSON.parse(localStorage.getItem("tresde-scene") || "{}");
  const state = persisted?.state;
  if (state?.objects) {
    for (const obj of state.objects) {
      const m = obj.id?.match(/^obj-(\d+)$/);
      if (m) counter = Math.max(counter, Number(m[1]));
    }
  }
  if (state?.slides) {
    for (const sl of state.slides) {
      const m = sl.id?.match(/^slide-(\d+)$/);
      if (m) slideCounter = Math.max(slideCounter, Number(m[1]));
    }
  }
} catch {}
const names: Record<GeometryType, string> = {
  box: "Cubo",
  sphere: "Esfera",
  torus: "Torus",
  roundedBox: "RoundedBox",
  dodecahedron: "Dodecaedro",
  text3d: "Texto 3D",
  cylinder: "Moneda",
};

export const useSceneStore = create<SceneState>()(persist<SceneState>((set) => ({
  objects: [
    {
      id: "obj-0",
      name: "Texto 3D 0",
      geometry: "text3d",
      material: "standard",
      animation: "float",
      position: [0, 1.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: "#a78bfa",
      metalness: 0.3,
      roughness: 0.2,
      text: "Hola Pelusina",
    },
    {
      id: "obj-1",
      name: "Texto 3D 1",
      geometry: "text3d",
      material: "standard",
      animation: "float",
      position: [0, 0.5, -2],
      rotation: [0, 0, 0],
      scale: [0.8, 0.8, 0.8],
      color: "#f472b6",
      metalness: 0.3,
      roughness: 0.2,
      text: "A ver, editeme",
    },
  ],
  selectedId: null,
  environment: "city",
  bgColor: "#000000",
  cameraPosition: [5, 4, 5],
  cameraTarget: [0, 0, 0],
  transformMode: "translate",
  slides: [],
  activeSlideId: null,
  flyToSlideId: null,

  addObject: (geometry, position?) => {
    const id = `obj-${++counter}`;
    const obj: SceneObject = {
      id,
      name: `${names[geometry]} ${counter}`,
      geometry,
      material: "standard",
      animation: "none",
      position: position ?? [Math.random() * 2 - 1, 0.5, Math.random() * 2 - 1],
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

  duplicateObject: (id) =>
    set((s) => {
      const src = s.objects.find((o) => o.id === id);
      if (!src) return s;
      const newId = `obj-${++counter}`;
      const clone: SceneObject = {
        ...src,
        id: newId,
        name: `${src.name} copy`,
        position: [src.position[0] + 0.5, src.position[1], src.position[2] + 0.5],
      };
      return { objects: [...s.objects, clone], selectedId: newId };
    }),

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

  setCameraState: (cameraPosition, cameraTarget) => set({ cameraPosition, cameraTarget }),
  setEnvironment: (environment) => set({ environment }),
  setBgColor: (bgColor) => set({ bgColor }),
  setTransformMode: (transformMode) => set({ transformMode }),

  loadTemplate: (template) => {
    const newObjects = template.map((t) => ({
      ...t,
      id: `obj-${++counter}`,
    }));
    set({ objects: newObjects, selectedId: null });
  },

  addSlide: (cameraPosition, cameraTarget) => {
    const id = `slide-${++slideCounter}`;
    const slide: Slide = {
      id,
      name: `Slide ${slideCounter}`,
      cameraPosition,
      cameraTarget,
      duration: 1,
    };
    set((s) => ({ slides: [...s.slides, slide], activeSlideId: id }));
  },

  removeSlide: (id) =>
    set((s) => ({
      slides: s.slides.filter((sl) => sl.id !== id),
      activeSlideId: s.activeSlideId === id ? null : s.activeSlideId,
    })),

  updateSlide: (id, updates) =>
    set((s) => ({
      slides: s.slides.map((sl) => (sl.id === id ? { ...sl, ...updates } : sl)),
    })),

  reorderSlides: (fromIndex, toIndex) =>
    set((s) => {
      const slides = [...s.slides];
      const [moved] = slides.splice(fromIndex, 1);
      slides.splice(toIndex, 0, moved);
      return { slides };
    }),

  setActiveSlide: (id) => set({ activeSlideId: id }),
  flyToSlide: (id) => set({ flyToSlideId: id, activeSlideId: id }),
  clearFlyTo: () => set({ flyToSlideId: null }),
  hoveredGroup: null,
  setHoveredGroup: (group) => set({ hoveredGroup: group }),
  loadScene: (data) => set({
    objects: data.objects,
    environment: data.environment,
    bgColor: data.bgColor,
    slides: data.slides,
    cameraPosition: data.cameraPosition,
    cameraTarget: data.cameraTarget,
    selectedId: null,
    activeSlideId: null,
  }),
}), { name: "tresde-scene" }));
