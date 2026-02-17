"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Phone, MessageCircle } from "lucide-react";

interface OrgNodeData {
  id: string;
  name: string;
  designation: string;
  avatar?: string;
  phone?: string;
  status: "online" | "away" | "offline";
  children?: OrgNodeData[];
}

interface OrgNodeProps {
  node: OrgNodeData;
  isRoot?: boolean;
  onSelect?: (id: string) => void;
}

const statusColors = {
  online: "bg-green-500",
  away: "bg-yellow-500",
  offline: "bg-gray-500",
};

export default function OrgNode({ node, isRoot = false, onSelect }: OrgNodeProps) {
  const [isExpanded, setIsExpanded] = useState(isRoot);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div
        onClick={() => onSelect?.(node.id)}
        className={cn(
          "bg-white dark:bg-[#1A2633] rounded-xl border shadow-sm p-4 cursor-pointer hover:shadow-xl transition-all duration-300 w-full max-w-[280px]",
          isRoot
            ? "border-primary/50 ring-2 ring-primary/20"
            : "border-gray-200 dark:border-gray-700"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {node.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <span
              className={cn(
                "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#1A2633]",
                statusColors[node.status]
              )}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{node.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {node.designation}
            </p>
          </div>
          {/* Expand/collapse toggle */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-gray-400 transition-transform duration-200",
                  !isExpanded && "-rotate-90"
                )}
              />
            </button>
          )}
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          {node.phone ? (
            <a
              href={`tel:${node.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-primary" />
            </a>
          ) : (
            <span className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-50">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
            </span>
          )}
          {node.phone ? (
            <a
              href={`https://wa.me/91${node.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-primary" />
            </a>
          ) : (
            <span className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-50">
              <MessageCircle className="w-3.5 h-3.5 text-gray-400" />
            </span>
          )}
          {hasChildren && (
            <span className="ml-auto text-xs text-gray-400">
              {node.children!.length} report{node.children!.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Children — vertical stack */}
      {hasChildren && isExpanded && (
        <div className="relative mt-2 flex flex-col items-center gap-2 pl-6 border-l-2 border-gray-200 dark:border-gray-700 ml-6 self-start w-full">
          {node.children!.map((child) => (
            <div key={child.id} className="relative w-full">
              {/* Horizontal tick from the vertical line */}
              <div className="absolute -left-6 top-1/2 w-6 h-0.5 bg-gray-200 dark:bg-gray-700" />
              <OrgNode node={child} onSelect={onSelect} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export type { OrgNodeData };
