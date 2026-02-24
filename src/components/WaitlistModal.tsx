import { useState } from "react";

export function WaitlistModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || state === "loading") return;
    setState("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setState("success");
      setTimeout(onClose, 2000);
    } catch {
      setState("idle");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-md w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors text-lg"
        >
          ✕
        </button>

        {state === "success" ? (
          <div className="text-center py-4">
            <p className="text-2xl font-bold text-white mb-2">¡Listo!</p>
            <p className="text-zinc-400">Te avisaremos cuando lancemos.</p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white mb-2">
              Únete a la lista de espera
            </h2>
            <p className="text-zinc-400 text-sm mb-6">
              Sé de los primeros en crear storytelling 3D con scroll
            </p>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500"
              />
              <button
                type="submit"
                disabled={state === "loading"}
                className="bg-violet-600 hover:bg-violet-500 text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50 whitespace-nowrap"
              >
                {state === "loading" ? "..." : "Unirme"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
