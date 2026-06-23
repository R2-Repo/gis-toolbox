import { mountIsland } from '../mountIsland.jsx';
import { FeatureEditorDialog } from './FeatureEditorDialog.jsx';

export function mountFeatureEditorDialog(element, props = {}) {
    if (!element) throw new Error('mountFeatureEditorDialog: target element is required');
    return { unmount: mountIsland(element, FeatureEditorDialog, props) };
}
