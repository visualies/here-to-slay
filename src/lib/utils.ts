import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate random transformations based on seed and level
export function getRandomTransform(seed: string, index?: number, level: number = 0) {
  if (level === 0) return '';
  
  let hash = 0;
  const fullSeed = seed + (index !== undefined ? index.toString() : '');
  for (let i = 0; i < fullSeed.length; i++) {
    const char = fullSeed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Add extra randomization with index if provided
  if (index !== undefined) {
    hash = hash ^ (index * 31);
  }
  
  // Create multiple hash values for better distribution
  const hash2 = ((hash * 1103515245) + 12345) & 0x7fffffff;
  const hash3 = ((hash2 * 16807) + 0) & 0x7fffffff;
  const hash4 = ((hash3 * 48271) + 0) & 0x7fffffff;
  
  // Scale rotation based on level (0-5) - much more dramatic for high levels
  const maxRotation = level === 1 ? 3 : level === 5 ? 40 : level * 10; // Level 1 = 3 degrees, Level 5 = 180 degrees max
  const rotation = (hash2 % (maxRotation * 2 + 1)) - maxRotation;
  
  // Position randomness - much more dramatic for level 5
  const maxTranslate = level === 1 ? 1 : level === 5 ? 80 : Math.min(2, level); // Level 1 = 1px, Level 5 = 20px max
  const translateX = (hash3 % (maxTranslate * 2 + 1)) - maxTranslate;
  const translateY = (hash4 % (maxTranslate * 2 + 1)) - maxTranslate;
  
  return `rotate(${rotation}deg) translate(${translateX}px, ${translateY}px)`;
}

// Generate random rotation for hover effects
export function getRandomHoverRotation(seed: string, index?: number) {
  let hash = 0;
  const fullSeed = seed + (index !== undefined ? index.toString() : '');
  for (let i = 0; i < fullSeed.length; i++) {
    const char = fullSeed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Add extra randomization with index if provided
  if (index !== undefined) {
    hash = hash ^ (index * 31);
  }
  
  // Create hash for rotation
  const hash2 = ((hash * 1103515245) + 12345) & 0x7fffffff;
  
  // Generate rotation between -8 and 8 degrees
  const rotation = (hash2 % 17) - 8; // -8 to 8 degrees
  
  return rotation;
}

// Calculate center-directed movement for hover effects
export function getCenterDirectedMovement(
  cardRect: DOMRect, 
  windowWidth: number, 
  windowHeight: number, 
  movementScale: number = 0.05
) {
  // Toggle constants for different movement effects
  const ENABLE_CENTER_MOVEMENT = false;
  const ENABLE_UPWARD_MOVEMENT = true;
  const ENABLE_BOUNDS_CHECKING = true;
  const UPWARD_MOVEMENT_PIXELS = 24;
  
  const centerX = windowWidth / 2;
  const centerY = windowHeight / 2;
  
  const cardCenterX = cardRect.left + cardRect.width / 2;
  const cardCenterY = cardRect.top + cardRect.height / 2;
  
  const deltaX = centerX - cardCenterX;
  const deltaY = centerY - cardCenterY;
  
  // Calculate distance from center
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  
  // Scale the movement based on distance (stronger effect for cards further from center)
  const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
  const scale = Math.min(distance / maxDistance, 1);
  
  // Apply movement towards center (scaled by distance) plus slight upward movement
  let moveX = ENABLE_CENTER_MOVEMENT ? deltaX * scale * movementScale : 0;
  let moveY = ENABLE_CENTER_MOVEMENT ? deltaY * scale * movementScale : 0;
  
  // Add upward movement if enabled
  if (ENABLE_UPWARD_MOVEMENT) {
    moveY -= UPWARD_MOVEMENT_PIXELS;
  }
  
  // Calculate bounds to prevent clipping when scaled (2x scale)
  if (ENABLE_BOUNDS_CHECKING) {
    const scaledWidth = cardRect.width * 2;
    const scaledHeight = cardRect.height * 2;
    
    // Calculate the new position after movement and scaling
    const newLeft = cardRect.left + moveX - (scaledWidth - cardRect.width) / 2;
    const newTop = cardRect.top + moveY - (scaledHeight - cardRect.height) / 2;
    const newRight = newLeft + scaledWidth;
    const newBottom = newTop + scaledHeight;
    
    // Adjust movement to keep card within viewport bounds (with some tolerance)
    const tolerance = 24; // Allow 20px of clipping before adjusting
    
    if (newLeft < -tolerance) {
      moveX += -(newLeft + tolerance);
    }
    if (newRight > windowWidth + tolerance) {
      moveX -= (newRight - windowWidth - tolerance);
    }
    if (newTop < -tolerance) {
      moveY += -(newTop + tolerance);
    }
    if (newBottom > windowHeight + tolerance) {
      moveY -= (newBottom - windowHeight - tolerance);
    }
  }
  
  return `translate(${moveX}px, ${moveY}px)`;
}