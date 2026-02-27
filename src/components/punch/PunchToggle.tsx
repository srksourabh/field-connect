"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface PunchToggleProps {
  isPunchedIn: boolean;
  onToggle: () => void;
}

const TRACK_PADDING = 4;
const THUMB_SIZE = 56;

export default function PunchToggle({ isPunchedIn, onToggle }: PunchToggleProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState<number | null>(null);
  const startXRef = useRef(0);
  const startOffsetRef = useRef(0);

  const getMaxOffset = useCallback(
    () => (trackRef.current?.clientWidth ?? 280) - THUMB_SIZE - TRACK_PADDING * 2,
    []
  );

  const restOffset = isPunchedIn ? getMaxOffset() : 0;

  const handleStart = useCallback(
    (clientX: number) => {
      startXRef.current = clientX;
      startOffsetRef.current = isPunchedIn ? getMaxOffset() : 0;
      setDragging(true);
      setDragX(startOffsetRef.current);
    },
    [isPunchedIn, getMaxOffset]
  );

  // Global move/end handlers via useEffect
  useEffect(() => {
    if (!dragging) return;

    const handleMove = (clientX: number) => {
      const max = getMaxOffset();
      const delta = clientX - startXRef.current;
      const newX = Math.max(0, Math.min(max, startOffsetRef.current + delta));
      setDragX(newX);
    };

    const handleEnd = () => {
      setDragging(false);
      setDragX((currentDragX) => {
        if (currentDragX === null) return null;
        const max = getMaxOffset();
        // Require 70% drag to trigger — prevents accidental activations
        const threshold = max * 0.7;
        if (!isPunchedIn && currentDragX >= threshold) {
          onToggle();
        } else if (isPunchedIn && currentDragX <= max - threshold) {
          onToggle();
        }
        return null;
      });
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onMouseUp = () => handleEnd();
    const onTouchEnd = () => handleEnd();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [dragging, isPunchedIn, onToggle, getMaxOffset]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const offset = dragX !== null ? dragX : restOffset;

  return (
    <div className="w-full max-w-[280px] mb-4">
      <div
        ref={trackRef}
        className={cn(
          "relative w-full h-16 rounded-full transition-colors duration-300 ease-in-out border select-none",
          isPunchedIn
            ? "bg-primary border-primary"
            : "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
        )}
      >
        {/* Sliding thumb */}
        <div
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          className={cn(
            "absolute top-1 w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing touch-none z-10",
            !dragging && "transition-all duration-300 ease-in-out"
          )}
          style={{ left: `${TRACK_PADDING + offset}px` }}
        >
          <div className="flex gap-0.5">
            <div className={cn("w-0.5 h-4 rounded-full", isPunchedIn ? "bg-primary" : "bg-slate-400")} />
            <div className={cn("w-0.5 h-4 rounded-full", isPunchedIn ? "bg-primary" : "bg-slate-400")} />
            <div className={cn("w-0.5 h-4 rounded-full", isPunchedIn ? "bg-primary" : "bg-slate-400")} />
          </div>
        </div>

        {/* Labels */}
        <span
          className={cn(
            "absolute right-6 top-0 bottom-0 flex items-center text-sm font-bold uppercase tracking-wide transition-opacity duration-300 pointer-events-none",
            isPunchedIn
              ? "opacity-0"
              : "opacity-100 text-slate-500 dark:text-slate-400"
          )}
        >
          Slide to Punch In
        </span>
        <span
          className={cn(
            "absolute left-6 top-0 bottom-0 flex items-center text-sm font-bold text-white uppercase tracking-wide transition-opacity duration-300 pointer-events-none",
            isPunchedIn ? "opacity-100" : "opacity-0"
          )}
        >
          Punched In
        </span>
      </div>
    </div>
  );
}
