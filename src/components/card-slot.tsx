import { cn } from "@/lib/utils";
import { useSizing } from "@/contexts/sizing-context";

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
  const { cardSize } = useSizing();
  
  // Calculate card dimensions based on global sizing context
  const cardWidth = size === "large" ? cardSize : cardSize * 0.8;
  
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
          "rounded flex items-center justify-center",
          hideOutline ? "border-none" : children ? "border-none" : "border-2 border-gray-300 border-dashed",
          children ? "shadow-md" : ""
        )}
        style={{
          width: `${cardWidth}px`,
          aspectRatio: (cardType === "party-leader" || cardType === "monster") ? "827/1417" : "5/7"
        }}
      >
        {children}
      </div>
    </div>
  );
}