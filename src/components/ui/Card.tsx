import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

const paddingMap = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export default function Card({ children, className, padding = "md" }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50",
        paddingMap[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
