import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hamshake — Make something real",
  description: "A creative workspace to build, preview, and refine ideas with AI.",
  icons: { icon: "/favicon.png" }
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
