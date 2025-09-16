/**
 * Selection mode enum for multi-target actions
 * Defines how to choose when multiple targets are available
 */
export enum SelectionMode {
  // Server-side automatic selection
  First = 'first',
  
  // Future implementations (not yet supported)
  Target = 'target',
  Destination = 'destination',
}