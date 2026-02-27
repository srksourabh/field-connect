"use client";

import { QrCode, Construction } from "lucide-react";
import Link from "next/link";

export default function QrPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-6">
        <Construction className="w-10 h-10 text-amber-500" />
      </div>
      <h2 className="text-xl font-bold mb-2">QR Check-In</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-xs">
        QR-based attendance check-in is coming soon. For now, please use the regular punch-in from the dashboard.
      </p>
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <QrCode className="w-10 h-10 text-primary" />
      </div>
      <Link
        href="/dashboard"
        className="uds-btn-primary w-full max-w-xs"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
