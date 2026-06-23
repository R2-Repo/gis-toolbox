import { computeFeatureDistance, metersToDisplayUnits } from '../../tools/feature-distance.js';
import { buildBBoxIndexEntries, bboxPreFilterByRadius, getFeatureBBox, minBBoxSeparationMeters } from '../../tools/spatial-bbox.js';

const CHUNK_SIZE = 200;

export const UNIT_LABELS = [
    { value: 'feet', label: 'Feet', abbr: 'ft' },
    { value: 'meters', label: 'Meters', abbr: 'm' },
    { value: 'miles', label: 'Miles', abbr: 'mi' },
    { value: 'kilometers', label: 'Kilometers', abbr: 'km' }
];

export function unitAbbr(unit) {
    return UNIT_LABELS.find((entry) => entry.value === unit)?.abbr ?? unit;
}

export function maxRadiusToMeters(maxRadius, units) {
    if (maxRadius === '' || maxRadius == null) return Infinity;
    const value = parseFloat(maxRadius);
    if (!Number.isFinite(value) || value <= 0) return Infinity;
    switch (units) {
        case 'feet':
            return value / 3.28084;
        case 'kilometers':
            return value * 1000;
        case 'miles':
            return value / 0.000621371;
        default:
            return value;
    }
}

function normalizeMappings(fieldMappings = []) {
    return fieldMappings
        .filter((mapping) => mapping?.targetField && mapping?.newFieldName)
        .map((mapping) => ({
            targetField: String(mapping.targetField),
            newFieldName: String(mapping.newFieldName)
        }));
}

export function validateProximityJoinConfig({
    sourceLayer,
    targetLayer,
    fieldMappings = [],
    maxRadius = '',
    writeDistance = true,
    writeMatchId = false,
    writeMatchLayer = false,
    matchIdField = ''
}) {
    const errors = [];

    if (!sourceLayer) errors.push('Choose the layer to update.');
    if (!targetLayer) errors.push('Choose the nearest-match layer.');
    if (sourceLayer && targetLayer && sourceLayer.id === targetLayer.id) {
        errors.push('The layer to update and nearest-match layer must be different.');
    }

    if ((sourceLayer?.geojson?.features?.length || 0) === 0) {
        errors.push('The layer to update has no features.');
    }
    if ((targetLayer?.geojson?.features?.length || 0) === 0) {
        errors.push('The nearest-match layer has no features.');
    }

    const validMappings = normalizeMappings(fieldMappings);
    const hasOutput = validMappings.length > 0
        || writeDistance
        || writeMatchLayer
        || (writeMatchId && matchIdField);
    if (!hasOutput) {
        errors.push('Choose at least one thing to add (distance, a copied field, or match info).');
    }

    const names = validMappings.map((mapping) => mapping.newFieldName);
    const duplicates = names.filter((name, idx) => names.indexOf(name) !== idx);
    if (duplicates.length > 0) {
        errors.push(`Duplicate new field names: ${[...new Set(duplicates)].join(', ')}`);
    }

    if (maxRadius !== '' && maxRadius != null) {
        const parsed = parseFloat(maxRadius);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            errors.push('Max search radius must be a positive number or left empty for unlimited.');
        }
    }

    if (writeMatchId && !matchIdField) {
        errors.push('Choose an ID field when adding matched target ID.');
    }

    return { errors, validMappings };
}

function findNearestFeature(srcFeature, targets, maxRadiusMeters, repMethod) {
    let best = null;
    let bestDistanceMeters = Infinity;
    const sourceBBox = getFeatureBBox(srcFeature);

    for (let i = 0; i < targets.length; i++) {
        const targetFeature = targets[i];
        if (!targetFeature?.geometry) continue;

        const targetBBox = getFeatureBBox(targetFeature);
        if (
            sourceBBox &&
            targetBBox &&
            bestDistanceMeters !== Infinity &&
            minBBoxSeparationMeters(sourceBBox, targetBBox) >= bestDistanceMeters
        ) {
            continue;
        }

        const result = computeFeatureDistance(srcFeature, targetFeature, repMethod);
        if (result.distanceMeters < bestDistanceMeters) {
            bestDistanceMeters = result.distanceMeters;
            best = {
                feature: targetFeature,
                distanceMeters: result.distanceMeters
            };
        }
    }

    if (!best) return null;
    if (Number.isFinite(maxRadiusMeters) && best.distanceMeters > maxRadiusMeters) return null;
    return best;
}

export function buildProximityPreview({
    sourceFeatures = [],
    targetFeatures = [],
    fieldMappings = [],
    units = 'feet',
    maxRadius = '',
    writeDistance = true,
    repMethod = 'center-of-mass',
    sampleSize = 10
}) {
    const validMappings = normalizeMappings(fieldMappings);
    const maxRadiusMeters = maxRadiusToMeters(maxRadius, units);
    const sample = sourceFeatures.slice(0, sampleSize);

    const columns = ['#', ...validMappings.map((mapping) => mapping.newFieldName)];
    if (writeDistance) columns.push('nearest_distance');

    const rows = [];
    for (let i = 0; i < sample.length; i++) {
        const sourceFeature = sample[i];
        const match = findNearestFeature(sourceFeature, targetFeatures, maxRadiusMeters, repMethod);
        const row = { '#': i + 1 };

        validMappings.forEach((mapping) => {
            row[mapping.newFieldName] = match
                ? (match.feature.properties?.[mapping.targetField] ?? null)
                : null;
        });

        if (writeDistance) {
            row.nearest_distance = match
                ? parseFloat(metersToDisplayUnits(match.distanceMeters, units).toFixed(2))
                : null;
        }
        rows.push(row);
    }

    return { columns, rows };
}

function nextTick() {
    return new Promise((resolve) => {
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => resolve());
            return;
        }
        setTimeout(resolve, 0);
    });
}

export async function runProximityJoin({
    allSourceFeatures = [],
    featureIndices = [],
    targetFeatures = [],
    fieldMappings = [],
    units = 'feet',
    maxRadius = '',
    repMethod = 'center-of-mass',
    writeDistance = true,
    writeMatchId = false,
    matchIdField = '',
    writeMatchLayer = false,
    targetLayerName = '',
    onProgress,
    isCancelled
}) {
    const validMappings = normalizeMappings(fieldMappings);
    const maxRadiusMeters = maxRadiusToMeters(maxRadius, units);
    const targetIndex = buildBBoxIndexEntries(targetFeatures);

    let matched = 0;
    let unmatched = 0;
    let invalidGeometry = 0;
    const distanceValues = [];
    const warnings = [];
    const total = featureIndices.length;
    let processed = 0;

    while (processed < total) {
        if (isCancelled?.()) {
            return {
                cancelled: true,
                total,
                processed,
                matched,
                unmatched,
                minDist: 0,
                maxDist: 0,
                avgDist: 0,
                warnings
            };
        }

        const chunkEnd = Math.min(processed + CHUNK_SIZE, total);
        for (; processed < chunkEnd; processed++) {
            const sourceIndex = featureIndices[processed];
            const sourceFeature = allSourceFeatures[sourceIndex];

            if (!sourceFeature?.geometry) {
                invalidGeometry++;
                unmatched++;
                continue;
            }

            let candidates = targetFeatures;
            if (Number.isFinite(maxRadiusMeters)) {
                candidates = bboxPreFilterByRadius(sourceFeature, targetIndex, targetFeatures, maxRadiusMeters);
            }

            const match = findNearestFeature(sourceFeature, candidates, maxRadiusMeters, repMethod);
            if (!sourceFeature.properties) sourceFeature.properties = {};

            if (match) {
                matched++;
                const distanceInUnits = metersToDisplayUnits(match.distanceMeters, units);
                distanceValues.push(distanceInUnits);

                validMappings.forEach((mapping) => {
                    sourceFeature.properties[mapping.newFieldName] = match.feature.properties?.[mapping.targetField] ?? null;
                });

                if (writeDistance) {
                    sourceFeature.properties.nearest_distance = parseFloat(distanceInUnits.toFixed(4));
                }
                if (writeMatchId) {
                    sourceFeature.properties.matched_target_id = match.feature.properties?.[matchIdField] ?? null;
                }
                if (writeMatchLayer) {
                    sourceFeature.properties.matched_target_layer = targetLayerName;
                }
            } else {
                unmatched++;
                validMappings.forEach((mapping) => {
                    sourceFeature.properties[mapping.newFieldName] = null;
                });
                if (writeDistance) sourceFeature.properties.nearest_distance = null;
                if (writeMatchId) sourceFeature.properties.matched_target_id = null;
                if (writeMatchLayer) sourceFeature.properties.matched_target_layer = null;
            }
        }

        onProgress?.(`Processing... ${processed.toLocaleString()} / ${total.toLocaleString()}`);
        await nextTick();
    }

    if (invalidGeometry > 0) {
        warnings.push(`${invalidGeometry} feature(s) had invalid or missing geometry.`);
    }
    if (unmatched > 0 && Number.isFinite(maxRadiusMeters)) {
        warnings.push(`${unmatched} feature(s) had no target within the max search radius.`);
    }

    const minDist = distanceValues.length > 0 ? Math.min(...distanceValues) : 0;
    const maxDist = distanceValues.length > 0 ? Math.max(...distanceValues) : 0;
    const avgDist = distanceValues.length > 0
        ? (distanceValues.reduce((sum, value) => sum + value, 0) / distanceValues.length)
        : 0;

    return {
        cancelled: false,
        total,
        processed: total,
        matched,
        unmatched,
        minDist,
        maxDist,
        avgDist,
        warnings
    };
}
