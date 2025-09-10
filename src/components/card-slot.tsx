import { cn } from "@/lib/utils";

interface CardSlotProps {
  className?: string;
  children?: React.ReactNode;
  label?: string;
  size?: "small" | "large" | "xl" | "2xl";
  cardType?: "hero" | "party-leader" | "monster";
  hideOutline?: boolean;
}

export function CardSlot({ className, children, label, size = "small", cardType = "hero", hideOutline = false }: CardSlotProps) {
  return (
    <div className={cn("relative", className)}>
      {label && (
        <div className="absolute -top-6 left-0 text-xs text-gray-600 font-medium whitespace-nowrap">
          {label}
        </div>
      )}
      <div 
        className={cn(
          "bg-background rounded overflow-visible flex items-center justify-center",
          size === "2xl" ? "w-40" : size === "xl" ? "w-40" : size === "large" ? "w-32" : "w-20",
          hideOutline ? "border-none" : children ? "border-none" : "border-2 border-gray-300 border-dashed",
          children ? "shadow-md" : ""
        )}
        style={{
          aspectRatio: (cardType === "party-leader" || cardType === "monster") ? "7/12" : "744/1039"
        }}
      >
        {children}
      </div>
    </div>
  );
}