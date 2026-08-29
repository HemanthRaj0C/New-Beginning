/**
 * Extracts pixel color matrix from a canvas, image element, or data URL.
 * Returns a 2D array grid[x][z] containing { r, g, b } normalized 0-1 values.
 */

export function extractPixelGrid(imageSource, resolution = 36) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // Only set crossOrigin for http/https URLs, NOT for data: URLs
    if (typeof imageSource === "string" && !imageSource.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = resolution;
      canvas.height = resolution;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Failed to get 2D context"));
        return;
      }

      // Draw image scaled to resolution x resolution
      ctx.drawImage(img, 0, 0, resolution, resolution);
      const imgData = ctx.getImageData(0, 0, resolution, resolution);
      const data = imgData.data;

      const grid = [];
      for (let x = 0; x < resolution; x++) {
        grid[x] = [];
        for (let z = 0; z < resolution; z++) {
          // Canvas pixel index (row-major: z is row y in canvas, x is col x)
          const idx = (z * resolution + x) * 4;
          grid[x][z] = {
            r: data[idx] / 255,
            g: data[idx + 1] / 255,
            b: data[idx + 2] / 255,
            a: data[idx + 3] / 255,
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

      // Create a flower-like pattern for demonstration
      const petal = Math.sin(angle * 6) * 0.3 + 0.7;

      let r, g, b;
      if (dist < resolution * 0.15) {
        // Yellow flower center
        r = 0.98;
        g = 0.85;
        b = 0.25;
      } else if (dist < resolution * 0.42 * petal) {
        // Soft pink/rose petals
        const t = (dist - resolution * 0.15) / (resolution * 0.3);
        r = 0.95 - t * 0.2;
        g = 0.45 + t * 0.3;
        b = 0.65 + t * 0.2;
      } else {
        // Meadow green background
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
