"use client";

import { X, Download, Share, PlusSquare } from "lucide-react";
import Image from "next/image";
import { usePWAInstall } from "@/hooks/usePWAInstall";

interface PWAInstallPromptProps {
  variant: "overlay" | "inline";
}

export default function PWAInstallPrompt({ variant }: PWAInstallPromptProps) {
  const { canInstall, isIOS, isStandalone, isDismissed, promptInstall, dismiss } =
    usePWAInstall();

  // Don't render if already installed, recently dismissed, or not installable
  if (isStandalone || isDismissed) return null;
  if (!canInstall && !isIOS) return null;

  if (variant === "overlay") {
    return (
      <div className="w-full max-w-sm mt-4">
        <div className="bg-white/95 dark:bg-surface-dark/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/20 relative">
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <Image
              src="/icon-192.png"
              alt="UDS HR"
              width={44}
              height={44}
              className="rounded-xl shadow-sm"
            />
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Install UDS HR
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Quick access from your home screen
              </p>
            </div>
          </div>

          {canInstall ? (
            <button
              onClick={promptInstall}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
            >
              <Download className="w-4 h-4" />
              Install App
            </button>
          ) : isIOS ? (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5">
              <span>Tap</span>
              <Share className="w-4 h-4 text-primary" />
              <span>then</span>
              <PlusSquare className="w-4 h-4 text-primary" />
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Add to Home Screen
              </span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // inline variant — fixed bottom bar for landing page
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="max-w-lg mx-auto bg-white rounded-2xl p-4 shadow-xl border border-primary/20 relative">
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss install prompt"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <Image
            src="/icon-192.png"
            alt="UDS HR"
            width={48}
            height={48}
            className="rounded-xl shadow-sm flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">Install UDS HR</p>
            <p className="text-xs text-gray-500 truncate">
              Add to home screen for instant access
            </p>
          </div>

          {canInstall ? (
            <button
              onClick={promptInstall}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25 flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              Install
            </button>
          ) : isIOS ? (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0">
              <Share className="w-4 h-4 text-primary" />
              <span>then</span>
              <PlusSquare className="w-4 h-4 text-primary" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
