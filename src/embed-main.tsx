import "./index.css";
import { createRoot } from "react-dom/client";
import { Canvas3D, scrollOffsetRef } from "./components/Canvas3D";
import { useSceneStore } from "./store/scene";
import { useState, useEffect } from "react";

declare global {
  interface Window {
    __TRESDE_DATA__?: any;
    __TRESDE_FONT__?: string;
  }
}

// Intercept fetch for font file when running standalone (file:// or embedded font)
if (window.__TRESDE_FONT__) {
  const originalFetch = window.fetch;
  window.fetch = function (input: any, init?: any) {
    const url = typeof input === "string" ? input : input?.url || "";
    if (url.includes("inter_bold.json") && window.__TRESDE_FONT__) {
      return Promise.resolve(new Response(window.__TRESDE_FONT__, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    }
    return originalFetch.call(window, input, init);
  } as typeof fetch;
}

function SlideTextOverlay({ slideIndex }: { slideIndex: number }) {
  const slides = useSceneStore((s) => s.slides);
  const slide = slides[slideIndex];
  if (!slide?.text) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <p className="text-white text-3xl md:text-5xl font-bold text-center px-8 drop-shadow-lg animate-fade-in">
        {slide.text}
      </p>
    </div>
  );
}

function EmbedApp() {
  const slides = useSceneStore((s) => s.slides);
  const [currentSlide, setCurrentSlide] = useState(0);
  const loadScene = useSceneStore((s) => s.loadScene);

  useEffect(() => {
    const data = window.__TRESDE_DATA__;
    if (data) {
      loadScene(data);
    }
  }, [loadScene]);

  return (
    <div className="h-screen w-screen relative bg-black overflow-hidden">
      <Canvas3D embed onSlideChange={setCurrentSlide} />
      {slides.length >= 2 && <SlideTextOverlay slideIndex={currentSlide} />}
      <a
        href="https://tresde.app"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 text-white/40 text-xs hover:text-white/70 transition-colors z-20"
      >
        hecho con tresde.app
      </a>
    </div>
  );
}

scrollOffsetRef.current = 0;
createRoot(document.getElementById("root")!).render(<EmbedApp />);
