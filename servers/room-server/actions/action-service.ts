// No longer need Y import since types are now imported from shared
import type { ActionContext, ActionResult } from '../../../shared/types';
import './index'; // Auto-import all actions to register them

/**
 * Internal Action Service
 *
 * Pure game logic functions that can be called by:
 * - API endpoints (with validation)
 * - Hero effects (without action point costs)
 * - Game events (triggered actions)
 */

// Types imported from shared/types

// Re-export registry for controllers to use
export { actionRegistry } from './action-registry';