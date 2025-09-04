import { cn } from "@/lib/utils";

interface CardSlotProps {
  className?: string;
  children?: React.ReactNode;
  label?: string;
  size?: "small" | "large";
}

export function CardSlot({ className, children, label, size = "small" }: CardSlotProps) {
  return (
    <div className={cn("relative", className)}>
      {label && (
        <div className="absolute -top-6 left-0 text-xs text-gray-600 font-medium">
          {label}
        </div>
      )}
      <div className={cn(
        "bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center",
        size === "large" ? "w-20 h-28" : "w-16 h-24"
      )}>
        {children}
      </div>
    </div>
  );
}