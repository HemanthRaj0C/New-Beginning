/**
 * Extracts pixel color matrix from a canvas, image element, or data URL.
 * Returns a 2D array grid[x][z] containing { r, g, b } normalized 0-1 values.
 *
 * Uses 4× supersampling with bilinear filtering to produce much smoother voxel colors:
 * each voxel color is the average of a 4×4 region in the oversampled canvas,
 * so neighboring voxels blend naturally rather than producing harsh pixel blocks.
 */

export function extractPixelGrid(imageSource, resolution = 36) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    // Only set crossOrigin for http/https URLs, NOT for data: URLs
    if (typeof imageSource === "string" && !imageSource.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => {
      // ── Supersampling: render at 4× resolution then box-filter down ──
      // The browser applies bilinear filtering when downscaling drawImage,
      // so the 4× canvas already contains sub-pixel blended colors.
      const SCALE = 4;
      const hi = resolution * SCALE; // e.g. 56 → 224

      const hiCanvas = document.createElement("canvas");
      hiCanvas.width  = hi;
      hiCanvas.height = hi;
      const hiCtx = hiCanvas.getContext("2d");

      if (!hiCtx) { reject(new Error("Failed to get 2D context")); return; }

      // imageSmoothingQuality = 'high' tells the browser to use a better filter
      hiCtx.imageSmoothingEnabled  = true;
      hiCtx.imageSmoothingQuality  = "high";
      hiCtx.drawImage(img, 0, 0, hi, hi);

      const hiData = hiCtx.getImageData(0, 0, hi, hi).data;

      // Box-filter: average the SCALE×SCALE block for each voxel position
      const grid = [];
      for (let x = 0; x < resolution; x++) {
        grid[x] = [];
        for (let z = 0; z < resolution; z++) {
          let r = 0, g = 0, b = 0, a = 0;
          const ox = x * SCALE;
          const oz = z * SCALE;

          for (let dx = 0; dx < SCALE; dx++) {
            for (let dz = 0; dz < SCALE; dz++) {
              const idx = ((oz + dz) * hi + (ox + dx)) * 4;
              r += hiData[idx];
              g += hiData[idx + 1];
              b += hiData[idx + 2];
              a += hiData[idx + 3];
            }
          }

          const inv = 1 / (SCALE * SCALE * 255);
          grid[x][z] = {
            r: r * inv,
            g: g * inv,
            b: b * inv,
            a: a * inv,
          };
        }
      }

      resolve(grid);
    };

    img.onerror = (err) => {
      console.error("imageProcessor onload error:", err);
      reject(err);
    };

    if (typeof imageSource === "string") {
      img.src = imageSource;
    } else if (imageSource instanceof Blob || imageSource instanceof File) {
      img.src = URL.createObjectURL(imageSource);
    } else {
      reject(new Error("Invalid image source"));
    }
  });
}

/**
 * Generates a default procedural floral/landscape sample grid if no photo is uploaded yet.
 */
export function generateSamplePixelGrid(resolution = 36) {
  const grid = [];
  const cx = resolution / 2;
  const cz = resolution / 2;

  for (let x = 0; x < resolution; x++) {
    grid[x] = [];
    for (let z = 0; z < resolution; z++) {
      const dx = x - cx;
      const dz = z - cz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);

      const petal = Math.sin(angle * 6) * 0.3 + 0.7;

      let r, g, b;
      if (dist < resolution * 0.15) {
        r = 0.98; g = 0.85; b = 0.25;
      } else if (dist < resolution * 0.42 * petal) {
        const t = (dist - resolution * 0.15) / (resolution * 0.3);
        r = 0.95 - t * 0.2;
        g = 0.45 + t * 0.3;
        b = 0.65 + t * 0.2;
      } else {
        const noise = (Math.sin(x * 0.5) + Math.cos(z * 0.5)) * 0.1;
        r = 0.2 + noise;
        g = 0.65 + noise;
        b = 0.35 + noise;
      }

      grid[x][z] = { r, g, b, a: 1.0 };
    }
  }

  return grid;
}
