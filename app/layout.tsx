import "../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chord Timeline Fretboard",
  description: "Build a chord timeline and visualize it on a guitar fretboard."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-6">{children}</div>
      </body>
    </html>
  );
}
