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