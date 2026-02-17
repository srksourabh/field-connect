import { cn } from "@/lib/utils";

interface MobileShellProps {
  children: React.ReactNode;
  className?: string;
}

export default function MobileShell({ children, className }: MobileShellProps) {
  return (
    <div className={cn("max-w-md mx-auto lg:max-w-full min-h-screen relative", className)}>
      {children}
    </div>
  );
}
