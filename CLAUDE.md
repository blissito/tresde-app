# tresde.app

Herramienta para crear **storytelling 3D con scroll** — no un editor 3D genérico. El usuario crea escenas con objetos 3D, define "slides" (keyframes de cámara + texto), y el resultado es una experiencia scroll-driven animada. Como las páginas de producto de Apple pero que cualquiera pueda crear.

El producto se exporta como HTML standalone (Three.js + CDN) que se comparte/embebe en cualquier sitio.

## Tech stack

- React 19 + TypeScript + Vite
- Three.js con React Three Fiber + Drei
- Zustand (estado global)
- Tailwind CSS v4
- Theatre.js (instalado, aún no integrado al flujo de slides)
- Leva (controles de debug)
- Deploy: Fly.io (Dockerfile + nginx)

## Estructura

```
src/
  App.tsx              — Router: EditorView | EmbedView (/embed)
  main.tsx             — Entry point
  store/scene.ts       — Zustand store: objetos, selección, environment, transformMode
  components/
    Canvas3D.tsx       — Canvas R3F con escena, gizmo, controles
    Sidebar.tsx        — Lista de objetos, agregar geometrías, templates
    PropsPanel.tsx     — Panel de propiedades del objeto seleccionado
    SceneObject.tsx    — Renderiza un objeto 3D según su config
    CodePreview.tsx    — Genera código R3F de la escena actual
  templates/
    epic-hero.ts       — Template de escena predefinida
    glass-hero.ts      — Template con materiales glass
```

## Estado actual (features completados)

- Editor 3D con viewport interactivo (orbit controls)
- Agregar objetos: box, sphere, torus, roundedBox, dodecahedron, text3d
- Materiales: standard, transmission (glass), distort, wobble
- Animaciones por objeto: float, rotate
- TransformControls (translate/rotate/scale) con gizmo
- Panel de propiedades: color, metalness, roughness, params por material
- Templates precargados (epic-hero, glass-hero)
- HDRI environments (city, etc.)
- Vista previa fullscreen (botón Play)
- Vista embed (/embed) con marca de agua "hecho con tresde.app"
- CodePreview: genera código R3F de la escena
- Deploy en Fly.io

## Roadmap

### Fase 1 — Storytelling Core (scroll-driven scenes)
- [ ] Modelo de datos: "slides" — cada slide tiene: camera position/target, objetos visibles/ocultos, texto overlay, duración/easing
- [ ] UI de slides: timeline/lista en sidebar para agregar/reordenar slides
- [ ] ScrollControls integration (drei) para navegar entre slides en preview
- [ ] Transiciones de cámara entre slides (lerp suave) — **TODO: flyTo/slides broken, camera save/restore needs debugging**
- [ ] Transiciones de objetos entre slides (aparecer, desaparecer, mover, escalar)
- [ ] Text overlays por slide (título, subtítulo, párrafo) con posición 2D configurable
- [ ] Preview con scroll funcional (botón Play ya existe)
- [ ] Texto fijo HTML overlay (títulos grandes legibles) + objeto 3D como ilustración con interacción hover (desarmar, explotar, transformar). Estilo Spline hero sections.

### Fase 2 — Editor UX esencial
- [ ] Undo/redo (zundo)
- [ ] Keyboard shortcuts (Delete, Cmd+Z, Cmd+D)
- [ ] Duplicar objeto
- [ ] Guardar escena en localStorage (auto-save)
- [ ] Guardar/cargar escenas como JSON

### Fase 3 — Export
- [ ] Export como HTML standalone (Three.js vanilla + GSAP ScrollTrigger desde CDN, un solo archivo)
- [ ] Export como código React/R3F (mejorar CodePreview actual)
- [ ] Embed vía URL (`/embed/:id`) con scroll funcional
- [ ] Marca de agua "hecho con tresde.app" en exports/embeds

### Fase 4 — Más contenido
- [ ] Más geometrías (cylinder, cone, plane, ring, torusKnot)
- [ ] Import modelos 3D (.glb/.gltf)
- [ ] Texturas/imágenes en materiales
- [ ] HDRI custom
- [ ] Luces editables

### Fase 5 — Persistencia y Cuentas
- [ ] Backend con SQLite
- [ ] Auth
- [ ] Guardar escenas en la nube (por usuario)
- [ ] Galería "Mis proyectos"
- [ ] URLs únicos por escena (`/scene/:id`)
- [ ] Compartir escena (link público)

### Fase 6 — Monetización
- [ ] Landing page
- [ ] Plan gratuito: marca de agua, límite de slides/escenas
- [ ] Plan Pro: sin marca de agua, export HTML, escenas ilimitadas, import GLB
- [ ] Integración MercadoPago
- [ ] Dashboard de billing

### Fase 7 — IA generativa
- [ ] Prompt → escena: "crea un showcase de producto tech" genera slides con objetos, cámara, textos
- [ ] Prompt → slide: "agrega un slide dramático con zoom-in" inserta un slide con los parámetros correctos
- [ ] Sugerencias de IA para mejorar transiciones/timing
- [ ] Usar Claude API como backend para generación
- [ ] Templates generados por IA como punto de partida

### Fase 8 — Nice to have
- [ ] Templates de storytelling pre-hechos (product showcase, portfolio, pitch deck)
- [ ] Colaboración real-time
- [ ] Post-processing (bloom, DOF)
- [ ] Animaciones por keyframe (no solo entre slides)
- [ ] Música/sonido ambiente por slide
