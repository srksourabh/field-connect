"use client";

import { useEffect } from "react";
import { logError } from "@/lib/utils";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <p className="text-lg font-semibold mb-2">Something went wrong</p>
      <p className="text-sm text-gray-500 mb-4">An unexpected error occurred. Please try again.</p>
      <button onClick={reset} className="uds-btn-primary px-6">
        Try Again
      </button>
    </div>
  );
}
