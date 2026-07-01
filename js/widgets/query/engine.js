import {
    applyFilters,
    applyFiltersAsync,
    DATAPREP_CHUNK_THRESHOLD,
    evaluateRule
} from '../../dataprep/transforms.js';

export const QUERY_OPERATORS = [
    { value: 'equals', label: 'Is exactly' },
    { value: 'not_equals', label: 'Is not' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'gte', label: 'Greater or equal' },
    { value: 'lte', label: 'Less or equal' },
    { value: 'is_null', label: 'Is empty' },
    { value: 'is_not_null', label: 'Is not empty' },
    { value: 'in', label: 'In list (comma-separated)' }
];

export const DEFAULT_RESULT_BEHAVIOR = {
    highlightResults: true,
    zoomToResults: true,
    selectResults: false,
    flashResults: false,
    createResultLayer: false,
    applyAsFilter: false
};

export const ZOOM_MODES = [
    { value: 'all', label: 'Zoom to all matching features' },
    { value: 'first', label: 'Zoom to first matching feature' },
    { value: 'none', label: 'Do not zoom' }
];

const VALUE_OPTIONAL_OPERATORS = new Set(['is_null', 'is_not_null']);

function featureIndex(feature, fallbackIndex) {
    const idx = feature?.properties?._featureIndex;
    return Number.isInteger(idx) ? idx : fallbackIndex;
}

function matchesConditions(props, conditions, logic) {
    const results = conditions.map((rule) => evaluateRule(props, rule));
    return logic === 'OR' ? results.some(Boolean) : results.every(Boolean);
}

/**
 * @param {object[]} conditions
 * @param {string} [logic]
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateQueryConditions(conditions = [], logic = 'AND') {
    if (!Array.isArray(conditions) || conditions.length === 0) {
        return { valid: false, error: 'Add at least one query condition.' };
    }

    for (let i = 0; i < conditions.length; i++) {
        const rule = conditions[i];
        if (!rule?.field) {
            return { valid: false, error: `Condition ${i + 1}: choose a field.` };
        }
        if (!rule?.operator) {
            return { valid: false, error: `Condition ${i + 1}: choose an operator.` };
        }
        if (!VALUE_OPTIONAL_OPERATORS.has(rule.operator) && String(rule.value ?? '').trim() === '') {
            return { valid: false, error: `Condition ${i + 1}: enter a value.` };
        }
    }

    if (logic !== 'AND' && logic !== 'OR') {
        return { valid: false, error: 'Logic must be AND or OR.' };
    }

    return { valid: true };
}

/**
 * @param {object} params
 * @param {object[]} params.features
 * @param {object[]} params.conditions
 * @param {string} [params.logic]
 * @returns {{ matchingIndices: number[], total: number }}
 */
export function runAttributeQuery({ features = [], conditions = [], logic = 'AND' }) {
    const validation = validateQueryConditions(conditions, logic);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    const matchingIndices = [];
    features.forEach((feature, index) => {
        const props = feature?.properties || {};
        if (matchesConditions(props, conditions, logic)) {
            matchingIndices.push(featureIndex(feature, index));
        }
    });

    return {
        matchingIndices,
        total: features.length
    };
}

/**
 * @param {object} params
 * @param {object[]} params.features
 * @param {object[]} params.conditions
 * @param {string} [params.logic]
 * @param {object} [params.task]
 * @returns {Promise<{ matchingIndices: number[], total: number }>}
 */
export async function runAttributeQueryAsync({ features = [], conditions = [], logic = 'AND', task = null }) {
    const validation = validateQueryConditions(conditions, logic);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    if (features.length < DATAPREP_CHUNK_THRESHOLD) {
        return runAttributeQuery({ features, conditions, logic });
    }

    const indexByFeature = new WeakMap();
    features.forEach((feature, index) => {
        indexByFeature.set(feature, featureIndex(feature, index));
    });

    const matched = await applyFiltersAsync(features, conditions, logic, task);
    const matchingIndices = matched.map((feature) => indexByFeature.get(feature)).filter((idx) => Number.isInteger(idx));

    return {
        matchingIndices,
        total: features.length
    };
}

/**
 * Resolve matching feature objects from indices.
 * @param {object[]} features
 * @param {number[]} matchingIndices
 * @returns {object[]}
 */
export function getMatchingFeatures(features = [], matchingIndices = []) {
    const indexSet = new Set(matchingIndices);
    return features.filter((feature, index) => indexSet.has(featureIndex(feature, index)));
}
