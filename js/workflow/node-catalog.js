import { INPUT_NODES } from './nodes/input-nodes.js';
import { TRANSFORM_NODES } from './nodes/transform-nodes.js';
import { SPATIAL_NODES } from './nodes/spatial-nodes.js';
import { ENRICHMENT_NODES } from './nodes/enrichment-nodes.js';
import { OUTPUT_NODES } from './nodes/output-nodes.js';
import { getNodeDescription } from './node-descriptions.js';

function withDescription(def) {
    return { ...def, description: getNodeDescription(def) };
}

export const NODE_CATEGORIES = [
    { key: 'input', label: 'Inputs', color: '#d97706', nodes: INPUT_NODES.map(withDescription) },
    { key: 'transform', label: 'Transforms', color: '#2563eb', nodes: TRANSFORM_NODES.map(withDescription) },
    { key: 'spatial', label: 'Spatial', color: '#059669', nodes: SPATIAL_NODES.map(withDescription) },
    { key: 'enrichment', label: 'Enrichment', color: '#0891b2', nodes: ENRICHMENT_NODES.map(withDescription) },
    { key: 'output', label: 'Outputs', color: '#7c3aed', nodes: OUTPUT_NODES.map(withDescription) }
];

export { getNodeDescription };

/** Look up a node definition by type across all categories. */
export function findNodeDef(type) {
    for (const cat of NODE_CATEGORIES) {
        const def = cat.nodes.find((n) => n.type === type);
        if (def) return def;
    }
    return null;
}
