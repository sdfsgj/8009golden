import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediGuide Demo",
  description: "A classroom demo for symptom understanding, drug explanation, and safety-aware triage."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
