import { INSPECTORS as INPUT_INSPECTORS } from './inputInspectors.jsx';
import { INSPECTORS as OUTPUT_INSPECTORS } from './outputInspectors.jsx';
import { INSPECTORS as ENRICHMENT_INSPECTORS } from './enrichmentInspectors.jsx';
import { TRANSFORM_INSPECTORS } from './transformInspectors.jsx';
import { SPATIAL_INSPECTORS } from './spatialInspectors.jsx';

export const NODE_INSPECTORS = {
    ...INPUT_INSPECTORS,
    ...OUTPUT_INSPECTORS,
    ...ENRICHMENT_INSPECTORS,
    ...TRANSFORM_INSPECTORS,
    ...SPATIAL_INSPECTORS
};

export function getNodeInspector(type) {
    return NODE_INSPECTORS[type] || null;
}
