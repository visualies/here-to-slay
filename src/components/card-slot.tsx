import { cn } from "@/lib/utils";

interface CardSlotProps {
  className?: string;
  children?: React.ReactNode;
  label?: string;
  size?: "default" | "large";
  cardType?: "hero" | "party-leader" | "monster";
  hideOutline?: boolean;
  noBg?: boolean;
}

export function CardSlot({ className, children, label, size = "default", cardType = "hero", hideOutline = false, noBg = false }: CardSlotProps) {
  return (
    <div className={cn("relative", className)}>
      {label && (
        <div className="absolute -top-6 left-0 text-xs text-gray-600 font-medium whitespace-nowrap">
          {label}
        </div>
      )}
      <div 
        className={cn(
          noBg ? "" : "bg-background",
          "rounded overflow-visible flex items-center justify-center",
          size === "large" ? "w-[clamp(1rem,15cqw,8rem)]" : "w-[clamp(0.875rem,12cqw,7rem)]", // Responsive widths using container queries
          hideOutline ? "border-none" : children ? "border-none" : "border-2 border-gray-300 border-dashed",
          children ? "shadow-md" : ""
        )}
        style={{
          aspectRatio: (cardType === "party-leader" || cardType === "monster") ? "827/1417" : "5/7"
        }}
      >
        {children}
      </div>
    </div>
  );
}