/**
 * Input nodes — data sources that start a pipeline
 */
import { NodeBase } from './node-base.js';
import { normalizeImporterResult, serializeImportedDataset, finalizeImportedDatasets } from '../../import/post-import.js';

// ==============================
// Layer Input — pick an existing layer
// ==============================
export class LayerInputNode extends NodeBase {
    constructor() {
        super('layer-input', {
            name: 'Layer Input',
            icon: '📂',
            category: 'input',
            color: '#d97706'
        });
        this.outputPorts = [{ id: 'out', label: 'Data', dataType: 'dataset' }];
        this.config = { layerId: null };
    }

    validate() {
        if (!this.config.layerId) return { valid: false, message: 'No layer selected' };
        return { valid: true, message: '' };
    }

    getOutputPreview(context) {
        if (this._outputData) return this._outputData;
        if (!this.config.layerId || !context?.getLayers) return null;
        const layer = context.getLayers().find(l => l.id === this.config.layerId);
        if (!layer) return null;
        return { type: layer.type, schema: layer.schema, name: layer.name };
    }

    getCanvasDetail(context = {}) {
        if (!this.config.layerId || !context.getLayers) return null;
        const layer = context.getLayers().find((l) => l.id === this.config.layerId);
        return layer?.name || null;
    }

    async execute(inputs, context) {
        const layer = context.getLayers().find(l => l.id === this.config.layerId);
        if (!layer) throw new Error('Source layer not found');
        if (layer.type === 'spatial') {
            const geojson = JSON.parse(JSON.stringify(layer.geojson));
            const schema = JSON.parse(JSON.stringify(layer.schema));
            return { type: 'spatial', geojson, schema, name: layer.name };
        }
        const rows = JSON.parse(JSON.stringify(layer.rows));
        const schema = JSON.parse(JSON.stringify(layer.schema));
        return { type: 'table', rows, schema, name: layer.name };
    }
}

// ==============================
// File Import — upload a file inline
// ==============================
export class FileImportNode extends NodeBase {
    constructor() {
        super('file-import', {
            name: 'File Import',
            icon: '📎',
            category: 'input',
            color: '#d97706'
        });
        this.outputPorts = [{ id: 'out', label: 'Data', dataType: 'dataset' }];
        this.config = { fileName: null };
        this._pendingFile = null;
        this._cachedResult = null;
    }

    validate() {
        if (!this._cachedResult && !this._pendingFile) return { valid: false, message: 'No file imported' };
        return { valid: true, message: '' };
    }

    getOutputPreview() {
        if (this._outputData) return this._outputData;
        if (this._cachedResult) return { type: this._cachedResult.type, schema: this._cachedResult.schema, name: this._cachedResult.name };
        return null;
    }

    getCanvasDetail() {
        return this.config.fileName || null;
    }

    async execute(inputs, context) {
        if (this._cachedResult) {
            return JSON.parse(JSON.stringify(this._cachedResult));
        }
        if (!this._pendingFile) throw new Error('No file imported — select a file first');
        const result = await context.importFile(this._pendingFile);
        if (!result) throw new Error('Import failed');
        const { expanded } = await finalizeImportedDatasets(normalizeImporterResult(result));
        if (expanded.length === 0) throw new Error('Import returned no layers');
        this._multiLayerCount = expanded.length;
        const out = serializeImportedDataset(expanded[0]);
        this._cachedResult = out;
        this._pendingFile = null;
        return JSON.parse(JSON.stringify(out));
    }
}

// ==============================
// Registry
// ==============================
export const INPUT_NODES = [
    { type: 'layer-input', label: 'Layer Input', icon: '📂', create: () => new LayerInputNode() },
    { type: 'file-import', label: 'File Import', icon: '📎', create: () => new FileImportNode() }
];
