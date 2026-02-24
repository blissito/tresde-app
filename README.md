# tresde.app

Herramienta para crear **storytelling 3D con scroll** — como las páginas de producto de Apple, pero que cualquiera pueda crear.

El usuario crea escenas con objetos 3D, define slides (keyframes de cámara + texto), y el resultado es una experiencia scroll-driven animada que se exporta como HTML standalone.

## v1 — Editor 3D funcional

Esta versión incluye el editor 3D completo con las siguientes capacidades:

- **Viewport 3D interactivo** con orbit controls y TransformControls (translate/rotate/scale)
- **Objetos**: box, sphere, torus, roundedBox, dodecahedron, text3D, modelos GLB
- **Materiales**: standard, transmission (glass), distort, wobble
- **Animaciones por objeto**: float, rotate
- **Panel de propiedades**: color, metalness, roughness, parámetros por material
- **Templates precargados** (epic-hero, glass-hero)
- **HDRI environments**
- **Vista previa fullscreen** (Play)
- **Export HTML standalone** (Three.js + CDN)
- **Publish a la nube** con URL compartible
- **Vista embed** (`/embed`) con marca de agua "hecho con tresde.app"
- **Persistencia** con SQLite (guardar/cargar escenas)

## v2 — Próximamente

La v2 traerá el core de storytelling scroll-driven: sistema de slides, transiciones de cámara, text overlays, interacciones por objeto, undo/redo, y mucho más. Ver `CLAUDE.md` para el roadmap completo.

## Tech Stack

React 19 + TypeScript + Vite + Three.js (React Three Fiber + Drei) + Zustand + Tailwind CSS v4

## Dev

```bash
bun install
bun run dev
```

## Deploy

```bash
fly deploy
```
