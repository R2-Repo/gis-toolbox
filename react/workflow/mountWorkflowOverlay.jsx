import { mountIsland } from '../mountIsland.jsx';
import { WorkflowOverlay } from './WorkflowOverlay.jsx';

export function mountWorkflowOverlay(element, props = {}) {
    return mountIsland(element, WorkflowOverlay, props);
}
