"use client";

import React, { useRef } from "react";
import Link from "next/link";
import NotFoundCanvas from "@/components/NotFoundCanvas";
import { Home, Focus, Sparkles, Compass, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const canvasRef = useRef(null);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0d16] text-slate-100 select-none font-sans">
      {/* 3D Interactive Scene Background */}
      <NotFoundCanvas ref={canvasRef} />

      {/* ── Top Bar ── */}
      <header className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Brand Badge */}
        <div className="pointer-events-auto flex items-center gap-3 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 px-4 py-2.5 rounded-2xl shadow-2xl">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center shadow-lg shadow-pink-500/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white tracking-wide">
                PhotoTree
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-pink-400 bg-pink-950/60 border border-pink-500/30 px-1.5 py-0.5 rounded-full uppercase">
                404
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Lost in the Canopy
            </p>
          </div>
        </div>

        {/* Right Action: Back Home Button */}
        <div className="pointer-events-auto flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-pink-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* ── Bottom Floating Card Overlay (Leaves 3D Tree Unobstructed) ── */}
      <div className="absolute bottom-6 left-0 right-0 z-10 flex flex-col items-center pointer-events-none px-4">
        <div className="pointer-events-auto w-full max-w-lg bg-slate-950/75 backdrop-blur-xl border border-slate-800/80 p-6 md:p-7 rounded-3xl shadow-2xl space-y-4 text-center animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-medium">
            <Compass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
            <span>404 — Page Floating Out of Bounds</span>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Lost Beyond The{" "}
              <span className="bg-gradient-to-r from-pink-400 via-rose-300 to-amber-300 bg-clip-text text-transparent">
                Voxel Canopy
              </span>
            </h1>
            <p className="text-xs md:text-sm text-slate-300/90 leading-relaxed mt-1.5 max-w-md mx-auto">
              This leaf has drifted away into space. Orbit around the 3D voxel tree above or return home.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold text-xs md:text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-pink-500/30 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              Return Home
            </Link>
          </div>
        </div>
      </div>

      {/* ── Floating Controls Sidebar (Right Side) ── */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={() => canvasRef.current?.resetCamera()}
          title="Reset 3D View"
          className="p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-slate-800/80 text-slate-300 hover:text-pink-400 shadow-xl transition-all hover:scale-110 active:scale-95"
        >
          <Focus className="w-5 h-5" />
        </button>
      </div>

      {/* ── Footer Branding ── */}
      <footer className="absolute bottom-4 left-4 z-20 pointer-events-auto hidden sm:block">
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/70 backdrop-blur-md border border-slate-800/80 px-3 py-1.5 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Interactive 3D Voxel Engine</span>
        </div>
      </footer>
    </div>
  );
}
