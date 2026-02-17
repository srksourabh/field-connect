import { cn } from "@/lib/utils";

type BadgeVariant = "success" | "error" | "warning" | "info" | "neutral";

const variants: Record<BadgeVariant, string> = {
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  neutral: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export default function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <span className={cn("uds-badge", variants[variant], className)}>
      {children}
    </span>
  );
}
