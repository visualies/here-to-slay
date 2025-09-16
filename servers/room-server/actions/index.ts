// Auto-import all actions to register them
import './draw-card';
import './capture-dice';
import './capture-modifier';
import './capture-challenge';
import './discard-card';
import './deduct-point';
import './steal-card';
import './destroy-card';
import './sacrifice-card';
import './place-card';
import './play-card';
import './end-turn';
import './end-move';
import './trade-hands';

// Re-export the registry for convenience
export { actionRegistry, registerAction } from './action-registry';