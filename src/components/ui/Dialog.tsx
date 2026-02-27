"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";

interface DialogConfig {
  title: string;
  message?: string;
  /** "confirm" = yes/no, "prompt" = text input + ok/cancel */
  type: "confirm" | "prompt";
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
}

type DialogResult = string | boolean | null;

let showDialogFn: ((config: DialogConfig) => Promise<DialogResult>) | null = null;

/**
 * Replacement for window.confirm() — returns true/false.
 */
export function showConfirm(title: string, message?: string): Promise<boolean> {
  if (!showDialogFn) return Promise.resolve(false);
  return showDialogFn({ title, message, type: "confirm" }).then((r) => r === true);
}

/**
 * Replacement for window.prompt() — returns string or null.
 */
export function showPrompt(
  title: string,
  message?: string,
  placeholder?: string
): Promise<string | null> {
  if (!showDialogFn) return Promise.resolve(null);
  return showDialogFn({ title, message, type: "prompt", placeholder }).then((r) =>
    typeof r === "string" ? r : null
  );
}

export function DialogContainer() {
  const [config, setConfig] = useState<DialogConfig | null>(null);
  const [inputValue, setInputValue] = useState("");
  const resolveRef = useRef<((value: DialogResult) => void) | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const openDialog = useCallback((cfg: DialogConfig): Promise<DialogResult> => {
    setConfig(cfg);
    setInputValue("");
    return new Promise<DialogResult>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  useEffect(() => {
    showDialogFn = openDialog;
    return () => {
      showDialogFn = null;
    };
  }, [openDialog]);

  useEffect(() => {
    if (config?.type === "prompt") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [config]);

  const close = (result: DialogResult) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setConfig(null);
  };

  if (!config) return null;

  const variant = config.confirmVariant || "primary";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => close(config.type === "confirm" ? false : null)}
      />
      {/* Dialog */}
      <div className="relative bg-white dark:bg-surface-dark rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700/50 w-[90%] max-w-sm mx-4 overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {config.title}
          </h3>
          <button
            onClick={() => close(config.type === "confirm" ? false : null)}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-4">
          {config.message && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {config.message}
            </p>
          )}
          {config.type === "prompt" && (
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={config.placeholder || "Type here..."}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  close(inputValue);
                }
              }}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={() => close(config.type === "confirm" ? false : null)}
            className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {config.cancelLabel || "Cancel"}
          </button>
          <button
            onClick={() =>
              close(config.type === "confirm" ? true : inputValue)
            }
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg text-white transition-colors ${
              variant === "danger"
                ? "bg-red-500 hover:bg-red-600"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {config.confirmLabel || (config.type === "confirm" ? "Confirm" : "Submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
