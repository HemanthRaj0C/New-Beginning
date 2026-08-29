"use client";

import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Crop, ZoomIn, RotateCw, Check, X } from "lucide-react";

/**
 * Creates an Image object from a URL safely without crossOrigin issues on data URLs.
 */
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    if (!url.startsWith("data:")) {
      image.setAttribute("crossOrigin", "anonymous");
    }
    image.src = url;
  });

/**
 * Calculates bounding box size for rotated images.
 */
function rotateSize(width, height, rotation) {
  const rotRad = (rotation * Math.PI) / 180;
  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * Crops an image using clean HTML5 canvas drawImage.
 */
async function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
  const image = await createImage(imageSrc);

  // Fallback if pixelCrop is missing or invalid
  const crop = pixelCrop || {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  };

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  const rotRad = (rotation * Math.PI) / 180;

  // Calculate size of bounding box of rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  // Set canvas size to match bounding box
  canvas.width = Math.ceil(bBoxWidth);
  canvas.height = Math.ceil(bBoxHeight);

  // Translate canvas center to image center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);

  // Draw rotated image
  ctx.drawImage(image, 0, 0);

  // Now create the final cropped canvas
  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d");

  if (!croppedCtx) return null;

  const targetWidth = Math.max(1, Math.round(crop.width));
  const targetHeight = Math.max(1, Math.round(crop.height));

  croppedCanvas.width = targetWidth;
  croppedCanvas.height = targetHeight;

  // Draw cropped portion from original canvas to final cropped canvas
  croppedCtx.drawImage(
    canvas,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return croppedCanvas.toDataURL("image/png");
}

export default function PhotoCropModal({ imageSrc, onCropComplete, onClose }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCropAreaChange = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      let pixels = croppedAreaPixels;

      // Fallback if react-easy-crop hasn't reported pixels yet
      if (!pixels) {
        const img = await createImage(imageSrc);
        const minDim = Math.min(img.width, img.height);
        pixels = {
          x: (img.width - minDim) / 2,
          y: (img.height - minDim) / 2,
          width: minDim,
          height: minDim,
        };
      }

      const croppedDataUrl = await getCroppedImg(
        imageSrc,
        pixels,
        rotation
      );

      if (croppedDataUrl) {
        onCropComplete(croppedDataUrl);
      } else {
        console.error("getCroppedImg returned null");
      }
    } catch (err) {
      console.error("Crop failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2 text-pink-400 font-semibold">
            <Crop className="w-4 h-4" />
            <span>Select Crop Area</span>
            <span className="text-xs text-slate-500 font-normal ml-1">
              (square)
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cropper */}
        <div className="relative w-full bg-slate-950" style={{ height: 320 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropAreaChange}
            style={{
              cropAreaStyle: {
                border: "2px solid rgba(236, 72, 153, 0.8)",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
              },
            }}
          />
        </div>

        {/* Controls */}
        <div className="p-5 space-y-4 bg-slate-900">
          {/* Zoom */}
          <div className="flex items-center gap-3">
            <ZoomIn className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1.5 rounded-full accent-pink-500 cursor-pointer bg-slate-800 appearance-none"
            />
            <span className="text-xs text-slate-400 w-8 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Rotation */}
          <div className="flex items-center gap-3">
            <RotateCw className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="flex-1 h-1.5 rounded-full accent-pink-500 cursor-pointer bg-slate-800 appearance-none"
            />
            <span className="text-xs text-slate-400 w-8 text-right">
              {rotation}°
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-1 border-t border-slate-800/60">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 rounded-xl shadow-lg shadow-pink-500/25 transition disabled:opacity-40 active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {isProcessing ? "Processing…" : "Generate 3D Tree"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
