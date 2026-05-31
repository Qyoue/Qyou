import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Qyou Starter",
  description: "Open source hackathon starter for the Qyou rebuild."
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
