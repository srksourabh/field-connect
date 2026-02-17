"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepProgressProps {
  currentStep: number;
  steps: string[];
}

export default function StepProgress({ currentStep, steps }: StepProgressProps) {
  return (
    <div className="flex items-center justify-between px-8 py-6 relative">
      {/* Connecting line */}
      <div className="absolute top-[2.35rem] left-14 right-14 h-0.5 bg-gray-200 dark:bg-gray-700" />
      <div
        className="absolute top-[2.35rem] left-14 h-0.5 bg-primary transition-all duration-500"
        style={{
          width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
          maxWidth: "calc(100% - 7rem)",
        }}
      />

      {steps.map((label, idx) => {
        const stepNum = idx + 1;
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        const isPending = stepNum > currentStep;

        return (
          <div key={label} className="flex flex-col items-center relative z-10">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                isCompleted && "bg-primary text-white",
                isActive && "bg-primary text-white ring-4 ring-primary/20",
                isPending && "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 opacity-50"
              )}
            >
              {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
            </div>
            <span
              className={cn(
                "text-[10px] font-medium mt-2 whitespace-nowrap",
                isActive ? "text-primary" : "text-gray-500 dark:text-gray-400",
                isPending && "opacity-50"
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
