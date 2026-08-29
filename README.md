# 🌲 PhotoTree — 3D Voxel Photo & Tree Visualizer

> **Top View = Your Photo • Side View = A 3D Voxel Tree**

**PhotoTree** is a web application built with **Next.js**, **Three.js**, and **Tailwind CSS**. It allows users to upload any photo, crop a region, and transform it into a 3D procedural voxel tree.

---

## ✨ Features

- 📸 **Photo to 3D Voxel Generation**: Upload any image and crop your target area. The app extracts a high-resolution pixel matrix and projects it onto a 3D voxel tree structure.
- 👁️ **Top-Down Illusion**: When viewed straight from above (`Snap Top View`), the topmost voxels align perfectly to reproduce your uploaded photo.
- 🌳 **6 Distinct 3D Tree Architectures**:
  - 🌸 **Sakura Blossom**: Multi-tiered cloud canopy.
  - 🌳 **Grand Oak**: Classic tall trunk with a wide dome canopy.
  - 🌲 **Pine**: Conical Christmas tree silhouette with stepped branch tiers.
  - 🍁 **Maple**: Layered horizontal disc tiers with a visible trunk.
  - 🌴 **Cedar**: Tabletop umbrella platform silhouette.
  - 🌺 **Lotus Flower**: 6-petal open bloom.
- 🌸☀️🍂❄️ **Dynamic Seasons & Procedural PBR Ground**:
  - **Spring**: Floating cherry blossom petals with procedural meadow grass & flower textures.
  - **Summer**: Gentle golden pollen sparkles with dense dark forest grass.
  - **Autumn**: Fast-falling rain streaks with fallen leaf earth textures.
  - **Winter**: Snowfall animation with snow mounds and ice crystal displacement maps.
- 📱 **Mobile-First & Distraction-Free UI**:
  - **Hide UI Toggle**: Easily collapse all overlays to view the 3D tree full-screen.
  - **Responsive Dock**: View navigation widget automatically adapts to desktop & mobile devices.
- ⚡ **Optimized WebGL Engine**: Built with Three.js `InstancedMesh`, canvas PBR textures, and zero-deadlock camera controls.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm** or **yarn** or **pnpm**

### Installation

1. **Clone the repository**:
   ```bash
   cd for-her
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```text
for-her/
├── src/
│   ├── app/
│   │   ├── layout.js          # Root layout with Geist font & hydration guards
│   │   ├── page.js            # Main application UI, state & controls
│   │   └── globals.css        # Global CSS styles & Tailwind directives
│   ├── components/
│   │   ├── VoxelCanvas.jsx    # Three.js WebGL canvas, controls & weather systems
│   │   └── PhotoCropModal.jsx # Image upload cropper with rotation & zoom
│   └── utils/
│       ├── imageProcessor.js  # Pixel matrix color sampling & HTML5 canvas crop
│       └── treeGenerator.js   # Procedural 3D voxel tree algorithm & height maps
├── public/                    # Static assets
└── package.json               # Dependencies & build scripts
```

---

## 🛠️ Built With

- [Next.js 15](https://nextjs.org/) — React Framework
- [Three.js](https://threejs.org/) — 3D WebGL Graphics Engine
- [GSAP](https://greensock.com/gsap/) — Smooth Camera Animations
- [Lucide React](https://lucide.dev/) — Modern UI Icons
- [react-easy-crop](https://github.com/ValentinH/react-easy-crop) — Interactive Canvas Image Cropping
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first Styling

---

## 📜 License

Created with ❤️ for Her.
