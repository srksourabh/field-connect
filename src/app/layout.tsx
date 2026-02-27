import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ToastContainer } from "@/components/ui/Toast";
import { DialogContainer } from "@/components/ui/Dialog";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "UDS HR (Beta) - Unified HR Platform",
  description: "Unified HR platform by Ultimate Digital Solutions — Field Connect, POSBuddy & more",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "UDS HR (Beta)",
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
        <DialogContainer />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){})}`,
          }}
        />
      </body>
    </html>
  );
}
