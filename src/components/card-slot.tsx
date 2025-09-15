import { cn } from "@/lib/utils";

// Constant to control background image visibility
const SHOW_CARD_SLOT_BACKGROUND_IMAGE = false;

interface CardSlotProps {
  className?: string;
  children?: React.ReactNode;
  label?: string;
  labelPosition?: "left" | "center";
  size?: "default" | "large" | "auto";
  cardType?: "hero" | "party-leader" | "monster";
  hideOutline?: boolean;
  noBg?: boolean;
}

export function CardSlot({ className, children, label, labelPosition = "left", size = "default", cardType = "hero", hideOutline = false, noBg = false }: CardSlotProps) {
  const isAutoSize = size === "auto";
  
  // Fixed card dimensions for non-auto sizes
  const cardWidth = size === "large" ? 120 : 96;
  
  return (
    <div className={cn("relative", isAutoSize ? "w-full h-full" : "", className)}>
      {label && (
        <div className={cn(
          "absolute -top-6 text-base text-muted-foreground font-heading whitespace-nowrap",
          labelPosition === "center" ? "left-1/2 -translate-x-1/2" : "left-0"
        )}>
          {label}
        </div>
      )}
      <div 
        className={cn(
          "rounded flex items-center justify-center relative",
          children ? "shadow-md" : "",
          isAutoSize ? "w-full h-full" : ""
        )}
        style={{
          ...(isAutoSize ? {} : {
            width: `${cardWidth}px`,
            aspectRatio: (cardType === "party-leader" || cardType === "monster") ? "827/1417" : "5/7"
          }),
          ...(!children && SHOW_CARD_SLOT_BACKGROUND_IMAGE ? {
            backgroundImage: "url('/Logo0.png')",
            backgroundSize: "60%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat"
          } : {}),
        }}
      >
        {/* Background overlay matching dots parent bg */}
        {!children && !noBg && (
          <div className="absolute inset-0 rounded bg-background" />
        )}
        
        {/* Dashed outline with reduced opacity */}
        {!hideOutline && !children && (
          <div 
            className="absolute inset-0 rounded"
            style={{
              borderWidth: "2px",
              borderColor: "var(--outline)",
              borderStyle: "dashed",
              opacity: "0.6"
            }}
          />
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