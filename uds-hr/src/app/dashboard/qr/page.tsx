"use client";

import { QrCode, Camera } from "lucide-react";

export default function QrPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <QrCode className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-xl font-bold mb-2">QR Check-In</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-xs">
        Scan the office QR code for quick attendance punch. Position the QR code within the camera frame.
      </p>
      <button className="uds-btn-primary w-full max-w-xs">
        <Camera className="w-5 h-5" />
        Open Camera
      </button>
      <p className="text-xs text-gray-400 mt-4">
        Camera permission required for scanning
      </p>
    </div>
  );
}
