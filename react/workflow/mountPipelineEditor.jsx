import { mountIsland } from '../mountIsland.jsx';
import { PipelineEditor } from './PipelineEditor.jsx';

export function mountPipelineEditor(element, props = {}) {
    return mountIsland(element, PipelineEditor, props);
}
