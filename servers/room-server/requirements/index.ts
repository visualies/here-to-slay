// Auto-import all requirements to register them
import './hero-class';
import './turn';
import './empty-queue';
import './action-point';
import './first-time';
import './hand-cards';

// Re-export the registry for convenience
export { requirementRegistry, registerRequirement } from './requirement-registry';