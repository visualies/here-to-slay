import { cn } from "@/lib/utils";

interface CardSlotProps {
  className?: string;
  children?: React.ReactNode;
  label?: string;
  size?: "default" | "large" | "auto";
  cardType?: "hero" | "party-leader" | "monster";
  hideOutline?: boolean;
  noBg?: boolean;
}

export function CardSlot({ className, children, label, size = "default", cardType = "hero", hideOutline = false, noBg = false }: CardSlotProps) {
  const isAutoSize = size === "auto";
  
  // Fixed card dimensions for non-auto sizes
  const cardWidth = size === "large" ? 120 : 96;
  
  return (
    <div className={cn("relative", isAutoSize ? "w-full h-full" : "", className)}>
      {label && (
        <div className="absolute -top-6 left-0 text-xs text-gray-600 font-medium whitespace-nowrap">
          {label}
        </div>
      )}
      <div 
        className={cn(
          "rounded flex items-center justify-center relative",
          hideOutline ? "border-none" : children ? "border-none" : "border-2 border-gray-300 border-dashed",
          children ? "shadow-md" : "",
          isAutoSize ? "w-full h-full" : ""
        )}
        style={{
          ...(isAutoSize ? {} : {
            width: `${cardWidth}px`,
            aspectRatio: (cardType === "party-leader" || cardType === "monster") ? "827/1417" : "5/7"
          }),
          ...(!children ? {
            backgroundImage: "url('/Logo0.png')",
            backgroundSize: "60%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat"
          } : {})
        }}
      >
        {/* White overlay */}
        {!children && !noBg && (
          <div className="absolute inset-0 bg-white/80 rounded" />
        )}
        
        {/* Content layer */}
        <div className={cn(
          "relative z-10 flex items-center justify-center w-full h-full",
          noBg ? "" : !children ? "" : "bg-background rounded"
        )}>
          {children}
        </div>
      </div>
    </div>
  );
}