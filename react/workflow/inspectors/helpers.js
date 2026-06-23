/** Shared helpers for workflow node inspectors */

export function getUpstreamFields(engine, nodeId, getLayers) {
    const layersFn = () => getLayers?.() || [];
    const upstream = engine.getUpstreamOutput(nodeId, { getLayers: layersFn });
    if (upstream?.schema?.fields) return upstream.schema.fields.map((f) => f.name);
    return [];
}

export function getUpstreamFieldsForPort(engine, nodeId, portId, getLayers) {
    const layersFn = () => getLayers?.() || [];
    const upstream = engine.getUpstreamOutputForPort(nodeId, portId, { getLayers: layersFn });
    if (upstream?.schema?.fields) return upstream.schema.fields.map((f) => f.name);
    return [];
}

export function getUpstreamData(engine, nodeId, getLayers) {
    const layersFn = () => getLayers?.() || [];
    return engine.getUpstreamOutput(nodeId, { getLayers: layersFn });
}

export function getUpstreamDataForPort(engine, nodeId, portId, getLayers) {
    const layersFn = () => getLayers?.() || [];
    return engine.getUpstreamOutputForPort(nodeId, portId, { getLayers: layersFn });
}

export function mergeConfigFields(fields, configValues = []) {
    const merged = [...fields];
    for (const v of configValues) {
        if (v && !merged.includes(v)) merged.push(v);
    }
    return merged;
}

export const FILTER_OPERATORS = [
    { v: 'equals', l: '=' },
    { v: 'not_equals', l: '≠' },
    { v: 'contains', l: 'contains' },
    { v: 'not_contains', l: '!contains' },
    { v: 'starts_with', l: 'starts with' },
    { v: 'ends_with', l: 'ends with' },
    { v: 'greater_than', l: '>' },
    { v: 'less_than', l: '<' },
    { v: 'gte', l: '≥' },
    { v: 'lte', l: '≤' },
    { v: 'is_null', l: 'is empty' },
    { v: 'is_not_null', l: 'is not empty' },
    { v: 'in', l: 'in list' }
];

export const COND_OPERATORS = [
    { v: 'equals', l: '=' },
    { v: 'not_equals', l: '≠' },
    { v: 'contains', l: 'contains' },
    { v: 'greater_than', l: '>' },
    { v: 'less_than', l: '<' },
    { v: 'gte', l: '≥' },
    { v: 'lte', l: '≤' },
    { v: 'is_null', l: 'is empty' },
    { v: 'is_not_null', l: 'is not empty' }
];

export const DISTANCE_UNITS = ['meters', 'kilometers', 'miles', 'feet'];
