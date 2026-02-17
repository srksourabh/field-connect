import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ToastContainer } from "@/components/ui/Toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "UDS HR - Unified HR Platform",
  description: "Unified HR platform by Ultimate Digital Solutions — Field Connect, POSBuddy & more",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "UDS HR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#137fec",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-background-light dark:bg-background-dark`}>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
