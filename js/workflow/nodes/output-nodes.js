/**
 * Output nodes — Preview and Add to Map
 */
import { NodeBase } from './node-base.js';

export class PreviewNode extends NodeBase {
    constructor() {
        super('preview', {
            name: 'Preview',
            icon: '👁️',
            category: 'output',
            color: '#7c3aed'
        });
        this.inputPorts = [{ id: 'in', label: 'Data', dataType: 'dataset' }];
        this.outputPorts = [];
        this.config = { maxRows: 500 };
    }

    validate() { return { valid: true, message: '' }; }

    async execute(inputs, context) {
        const data = inputs[0];
        if (!data) throw new Error('No input data');
        context.showPreview?.(data, this.config.maxRows);
        return data;
    }
}

export class AddToMapNode extends NodeBase {
    constructor() {
        super('add-to-map', {
            name: 'Add to Map',
            icon: '🗺️',
            category: 'output',
            color: '#7c3aed'
        });
        this.inputPorts = [{ id: 'in', label: 'Data', dataType: 'dataset' }];
        this.outputPorts = [];
        this.config = { layerName: '' };
        this._lastLayerId = null;
    }

    validate() { return { valid: true, message: '' }; }

    async execute(inputs, context) {
        const data = inputs[0];
        if (!data) throw new Error('No input data');
        const name = this.config.layerName || data.name || 'Workflow Result';
        const layerId = context.addToMap?.(data, name);
        if (layerId) this._lastLayerId = layerId;
        return data;
    }
}

export const OUTPUT_NODES = [
    { type: 'preview', label: 'Preview', icon: '👁️', create: () => new PreviewNode() },
    { type: 'add-to-map', label: 'Add to Map', icon: '🗺️', create: () => new AddToMapNode() }
];
