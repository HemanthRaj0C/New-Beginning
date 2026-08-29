"use client";

import React, { useState, useEffect, useRef } from "react";
import VoxelCanvas from "@/components/VoxelCanvas";
import PhotoCropModal from "@/components/PhotoCropModal";
import {
  extractPixelGrid,
  generateSamplePixelGrid,
} from "@/utils/imageProcessor";
import {
  generateTreeVoxels,
  getRandomTreeShape,
} from "@/utils/treeGenerator";
import {
  Upload,
  Dices,
  Eye,
  EyeOff,
  Trees,
  Box,
  Focus,
  Sun,
  CloudRain,
  Snowflake,
  Flower2,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [resolution, setResolution] = useState(56);

  const [pixelGrid, setPixelGrid] = useState(null);
  const [currentShape, setCurrentShape] = useState("sakura");
  const [voxels, setVoxels] = useState([]);
  const [season, setSeason] = useState("spring");
  const [uploadedImageSrc, setUploadedImageSrc] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hideUI, setHideUI] = useState(false);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize strictly on the client side to avoid SSR hydration mismatch
  useEffect(() => {
    setMounted(true);
    console.log("Initializing Home component sample grid on client...");
    const sampleGrid = generateSamplePixelGrid(resolution);
    setPixelGrid(sampleGrid);
    const initialShape = "sakura"; // Deterministic initial shape prevents SSR mismatch
    setCurrentShape(initialShape);
    const generatedVoxels = generateTreeVoxels(sampleGrid, initialShape);
    setVoxels(generatedVoxels);
    setIsLoading(false);
  }, []);

  // Re-generate tree voxels when pixelGrid or shape changes
  const rebuildTree = (grid, shape) => {
    if (!grid) return;
    setIsLoading(true);
    setTimeout(() => {
      console.log("Rebuilding tree for shape:", shape, "Resolution:", grid.length);
      const v = generateTreeVoxels(grid, shape);
      console.log("Generated voxels count:", v.length);
      setVoxels(v);
      setIsLoading(false);
    }, 10);
  };

  // Handle File Input Selection -> Opens Crop Modal
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImageSrc(reader.result);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Handle Crop Confirmation
  const handleCropComplete = async (croppedImageDataUrl) => {
    setShowCropModal(false);
    setUploadedImageSrc(croppedImageDataUrl);
    setIsLoading(true);

    try {
      const grid = await extractPixelGrid(croppedImageDataUrl, resolution);
      setPixelGrid(grid);

      const nextShape = getRandomTreeShape();
      setCurrentShape(nextShape);
      rebuildTree(grid, nextShape);
    } catch (err) {
      console.error("Failed to process photo:", err);
      setIsLoading(false);
    }
  };

  // Demo Image Handler
  const handleLoadDemoImage = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    
    ctx.fillStyle = "#ec4899";
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.arc(100, 100, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(75, 80, 10, 0, Math.PI * 2);
    ctx.arc(125, 80, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e11d48";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(100, 110, 35, 0.2, Math.PI - 0.2);
    ctx.stroke();

    const dataUrl = canvas.toDataURL("image/png");
    setUploadedImageSrc(dataUrl);
    setShowCropModal(true);
  };

  // Handle Randomize Tree Shape Button Click
  const handleRandomizeShape = () => {
    const nextShape = getRandomTreeShape();
    setCurrentShape(nextShape);
    rebuildTree(pixelGrid, nextShape);
  };

  // Prevent SSR hydration mismatch by rendering dark background container until client mounts
  if (!mounted) {
    return (
      <main className="relative w-screen h-screen overflow-hidden bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mb-3" />
      </main>
    );
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* 3D WebGL Canvas */}
      <VoxelCanvas
        ref={canvasRef}
        voxels={voxels}
        season={season}
        isFlat={false}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-sm transition-all duration-300">
          <div className="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium text-pink-300 animate-pulse flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-400" />
            Generating 3D Voxel Tree...
          </p>
        </div>
      )}

      {/* Floating Toggle Controls Button (Always accessible) */}
      <button
        onClick={() => setHideUI(!hideUI)}
        className="absolute top-4 right-4 z-40 p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-200 hover:text-white backdrop-blur-md shadow-2xl transition active:scale-95 cursor-pointer flex items-center gap-2 text-xs font-semibold"
        title={hideUI ? "Show UI Controls" : "Hide UI Overlay"}
      >
        {hideUI ? (
          <>
            <Eye className="w-4 h-4 text-pink-400" />
            <span className="hidden sm:inline">Show Controls</span>
          </>
        ) : (
          <>
            <EyeOff className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Hide UI</span>
          </>
        )}
      </button>

      {/* Top Header Bar */}
      <header
        className={`absolute top-4 left-4 right-16 sm:right-32 z-30 flex items-center justify-between gap-2 pointer-events-none transition-all duration-300 ${
          hideUI ? "opacity-0 pointer-events-none -translate-y-4" : "opacity-100"
        }`}
      >
        {/* Title Badge */}
        <div className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md shadow-xl">
          <div className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/20">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              PhotoTree <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">3D</span>
            </h1>
            <p className="hidden md:block text-xs text-slate-400">
              Top view = Photo • Side view = 3D Tree
            </p>
          </div>
        </div>

        {/* Action Buttons: Upload & Randomize */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-pink-500/25 transition active:scale-95 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Upload</span>
          </button>

          <button
            onClick={handleLoadDemoImage}
            title="Test Demo Image"
            className="flex items-center gap-1.5 px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs sm:text-sm font-medium backdrop-blur-md transition active:scale-95 cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
            <span className="hidden sm:inline">Demo</span>
          </button>

          <button
            onClick={handleRandomizeShape}
            title="Randomize Tree Shape"
            className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-slate-200 hover:text-white text-xs sm:text-sm font-medium backdrop-blur-md transition active:scale-95 shadow-xl cursor-pointer"
          >
            <Dices className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-400" />
            <span className="hidden sm:inline">Random Tree</span>
          </button>
        </div>
      </header>

      {/* View Navigation Widget (Responsive: Right side on Desktop, Bottom-right on Mobile) */}
      <div
        className={`absolute right-4 top-1/2 -translate-y-1/2 max-sm:top-auto max-sm:bottom-20 max-sm:translate-y-0 z-30 flex flex-col max-sm:flex-row items-center gap-2 p-1.5 rounded-2xl bg-slate-900/85 border border-slate-800/80 backdrop-blur-xl shadow-2xl transition-all duration-300 ${
          hideUI ? "opacity-0 pointer-events-none scale-95" : "opacity-100"
        }`}
      >
        {/* Snap to Top View Button */}
        <div className="relative group">
          <button
            onClick={() => canvasRef.current?.snapToTop()}
            className="p-2.5 sm:p-3 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-300 transition active:scale-90 shadow-md cursor-pointer"
            title="Snap to Top View"
          >
            <Focus className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400" />
          </button>
          <span className="hidden sm:block absolute right-full top-1/2 -translate-y-1/2 mr-3 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-medium text-pink-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
            Snap Top View (Photo)
          </span>
        </div>

        {/* Side View Button */}
        <div className="relative group">
          <button
            onClick={() => canvasRef.current?.snapToSide()}
            className="p-2.5 sm:p-3 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-white border border-transparent hover:border-slate-700/50 transition active:scale-90 cursor-pointer"
            title="Side View"
          >
            <Trees className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
          </button>
          <span className="hidden sm:block absolute right-full top-1/2 -translate-y-1/2 mr-3 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-medium text-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
            Side View (Tree Silhouette)
          </span>
        </div>

        {/* Isometric 3D View Button */}
        <div className="relative group">
          <button
            onClick={() => canvasRef.current?.snapToIsometric()}
            className="p-2.5 sm:p-3 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-white border border-transparent hover:border-slate-700/50 transition active:scale-90 cursor-pointer"
            title="Isometric 3D"
          >
            <Box className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
          </button>
          <span className="hidden sm:block absolute right-full top-1/2 -translate-y-1/2 mr-3 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-medium text-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
            Isometric 3D View
          </span>
        </div>
      </div>

      {/* Bottom Floating Season Control Dock */}
      <div
        className={`absolute bottom-7 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-1.5 sm:p-2 rounded-2xl bg-slate-900/85 border border-slate-800/80 backdrop-blur-xl shadow-2xl pointer-events-auto max-w-[92vw] overflow-x-auto transition-all duration-300 ${
          hideUI ? "opacity-0 pointer-events-none translate-y-4" : "opacity-100"
        }`}
      >
        <button
          onClick={() => setSeason("spring")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-medium transition cursor-pointer whitespace-nowrap ${
            season === "spring"
              ? "bg-pink-500 text-white shadow-lg shadow-pink-500/30 font-semibold"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Flower2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Spring</span>
        </button>

        <button
          onClick={() => setSeason("summer")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-medium transition cursor-pointer whitespace-nowrap ${
            season === "summer"
              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 font-semibold"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Summer</span>
        </button>

        <button
          onClick={() => setSeason("autumn")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-medium transition cursor-pointer whitespace-nowrap ${
            season === "autumn"
              ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30 font-semibold"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <CloudRain className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Autumn</span>
        </button>

        <button
          onClick={() => setSeason("winter")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-medium transition cursor-pointer whitespace-nowrap ${
            season === "winter"
              ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30 font-semibold"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Snowflake className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Winter</span>
        </button>
      </div>

      {/* Photo Crop Modal */}
      {showCropModal && uploadedImageSrc && (
        <PhotoCropModal
          imageSrc={uploadedImageSrc}
          onCropComplete={handleCropComplete}
          onClose={() => setShowCropModal(false)}
        />
      )}
    </main>
  );
}
