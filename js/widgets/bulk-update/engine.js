/**
 * Pure logic for bulk attribute updates on selected features.
 */

/**
 * @param {object[]} updates
 * @returns {object[]}
 */
export function normalizeBulkUpdates(updates = []) {
    return updates.filter((entry) => entry?.field);
}

/**
 * @param {object} params
 * @param {number[]} params.selectedIndices
 * @param {object[]} params.updates
 * @returns {{ valid: boolean, error?: string, safeUpdates?: object[] }}
 */
export function validateBulkUpdate({ selectedIndices = [], updates = [] }) {
    if (!selectedIndices.length) {
        return { valid: false, error: 'No selected features found for this layer.' };
    }

    const safeUpdates = normalizeBulkUpdates(updates);
    if (safeUpdates.length === 0) {
        return { valid: false, error: 'Add at least one field update.' };
    }

    return { valid: true, safeUpdates };
}

/**
 * Coerce a string form value to number when appropriate.
 * @param {string|number} rawValue
 * @returns {string|number}
 */
export function coercePropertyValue(rawValue) {
    const raw = rawValue ?? '';
    if (raw === '') return '';
    if (!Number.isNaN(Number(raw)) && String(raw).trim() !== '') {
        return Number(raw);
    }
    return raw;
}

/**
 * Apply field updates to selected features on a layer (mutates features in place).
 * @param {object} params
 * @param {object} params.layer - layer with geojson.features
 * @param {number[]} params.selectedIndices
 * @param {object[]} params.updates - { field, value }
 * @returns {{ updatedCount: number, fieldCount: number }}
 */
export function applyBulkUpdateToLayer({ layer, selectedIndices = [], updates = [] }) {
    const validation = validateBulkUpdate({ selectedIndices, updates });
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    const safeUpdates = validation.safeUpdates;
    let updatedCount = 0;

    selectedIndices.forEach((index) => {
        const feature = layer.geojson.features[index];
        if (!feature) return;
        if (!feature.properties) feature.properties = {};

        safeUpdates.forEach((entry) => {
            feature.properties[entry.field] = coercePropertyValue(entry.value);
        });
        updatedCount++;
    });

    return {
        updatedCount,
        fieldCount: safeUpdates.length
    };
}
