import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "PhotoTree — 3D Voxel Photo & Tree Visualizer",
  description: "Transform your photos into interactive 3D voxel trees. View from the top to reveal the photo, or rotate to see a 3D tree.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-slate-950 text-slate-100 selection:bg-pink-500 selection:text-white overflow-x-hidden"
      >
        {children}
      </body>
    </html>
  );
}
