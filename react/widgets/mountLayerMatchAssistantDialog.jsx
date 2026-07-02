import { mountIsland } from '../mountIsland.jsx';
import { LayerMatchAssistantDialog } from './LayerMatchAssistantDialog.jsx';

export function mountLayerMatchAssistantDialog(element, props = {}) {
    return { unmount: mountIsland(element, LayerMatchAssistantDialog, props) };
}
