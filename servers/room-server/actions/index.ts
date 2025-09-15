// Auto-import all actions to register them
import './draw-card';
import './play-hero-to-party';
import './attack-monster';
import './discard-all-and-redraw';
import './capture-dice';
import './capture-modifier';
import './capture-challenge';

// Re-export the registry for convenience
export { actionRegistry, registerAction } from './action-registry';