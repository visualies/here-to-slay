/**
 * Selection mode enum for multi-target actions
 * Defines how to choose when multiple targets are available
 */
export enum SelectionMode {
  // Server-side automatic selection
  First = 'first',

  // User input required - target owner chooses
  TargetOwner = 'target_owner',

  // User input required - destination owner chooses
  DestinationOwner = 'destination_owner',
}