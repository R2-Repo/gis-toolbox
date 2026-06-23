/**
 * Pre-import attribute / field filtering.
 */

/**
 * @param {string[]|null|undefined} selectedFields — null/undefined = all fields
 * @returns {boolean}
 */
export function shouldFilterFields(selectedFields) {
    return Array.isArray(selectedFields) && selectedFields.length > 0;
}

/**
 * @param {Record<string, unknown>|null|undefined} props
 * @param {string[]|null|undefined} selectedFields
 * @returns {Record<string, unknown>}
 */
export function filterProperties(props, selectedFields) {
    const src = props || {};
    if (!shouldFilterFields(selectedFields)) return { ...src };

    const out = {};
    for (const key of selectedFields) {
        if (Object.prototype.hasOwnProperty.call(src, key)) {
            out[key] = src[key];
        }
    }
    return out;
}

/**
 * @param {import('geojson').Feature} feature
 * @param {string[]|null|undefined} selectedFields
 */
export function filterFeatureProperties(feature, selectedFields) {
    if (!feature || !shouldFilterFields(selectedFields)) return feature;
    return {
        ...feature,
        properties: filterProperties(feature.properties, selectedFields)
    };
}

/**
 * @param {object[]} features
 * @param {string[]|null|undefined} selectedFields
 */
export function filterFeaturesProperties(features, selectedFields) {
    if (!shouldFilterFields(selectedFields) || !features?.length) return features;
    return features.map((f) => filterFeatureProperties(f, selectedFields));
}

/**
 * @param {Record<string, unknown>} row
 * @param {string[]|null|undefined} selectedFields
 */
export function filterTableRow(row, selectedFields) {
    if (!shouldFilterFields(selectedFields)) return row;
    return filterProperties(row, selectedFields);
}

/**
 * Update schema field `selected` flags from an explicit name list.
 * @param {object} schema
 * @param {string[]|null|undefined} selectedFields — null = all selected
 */
export function applySelectedFieldsToSchema(schema, selectedFields) {
    if (!schema?.fields?.length) return schema;
    if (!shouldFilterFields(selectedFields)) {
        return {
            ...schema,
            fields: schema.fields.map((f) => ({ ...f, selected: true }))
        };
    }
    const set = new Set(selectedFields);
    return {
        ...schema,
        fields: schema.fields.map((f) => ({
            ...f,
            selected: set.has(f.name)
        }))
    };
}

/**
 * @param {object} dataset
 * @param {string[]|null|undefined} selectedFields
 */
export function filterDatasetBySelectedFields(dataset, selectedFields) {
    if (!dataset || !shouldFilterFields(selectedFields)) return dataset;

    if (dataset.type === 'spatial' || dataset.type === 'spatial-chunked') {
        const features = dataset.geojson?.features;
        const filtered = features?.length
            ? filterFeaturesProperties(features, selectedFields)
            : features;
        return {
            ...dataset,
            geojson: filtered
                ? { ...(dataset.geojson || { type: 'FeatureCollection' }), features: filtered }
                : dataset.geojson,
            schema: applySelectedFieldsToSchema(dataset.schema, selectedFields),
            source: { ...dataset.source, importSelectedFields: selectedFields }
        };
    }

    if (dataset.type === 'table' && dataset.rows) {
        return {
            ...dataset,
            rows: dataset.rows.map((row) => filterTableRow(row, selectedFields)),
            schema: applySelectedFieldsToSchema(dataset.schema, selectedFields),
            source: { ...dataset.source, importSelectedFields: selectedFields }
        };
    }

    return dataset;
}

/**
 * @param {object|object[]} result
 * @param {string[]|null|undefined} selectedFields
 */
export function filterImportResult(result, selectedFields) {
    if (!shouldFilterFields(selectedFields)) return result;
    if (Array.isArray(result)) {
        return result.map((ds) => filterDatasetBySelectedFields(ds, selectedFields));
    }
    return filterDatasetBySelectedFields(result, selectedFields);
}

/**
 * Build ArcGIS outFields param from selection.
 * @param {string[]|null|undefined} selectedFields
 * @param {string} [objectIdField='OBJECTID']
 */
export function arcgisOutFieldsParam(selectedFields, objectIdField = 'OBJECTID') {
    if (!shouldFilterFields(selectedFields)) return '*';
    const names = [...selectedFields];
    if (objectIdField && !names.includes(objectIdField)) {
        names.unshift(objectIdField);
    }
    return names.join(',');
}

/**
 * @param {string[]} fieldNames
 * @param {string[]|null|undefined} selectedFields
 */
export function buildImportFieldSchema(fieldNames, selectedFields) {
    const selectedSet = shouldFilterFields(selectedFields)
        ? new Set(selectedFields)
        : null;
    return {
        fields: fieldNames.map((name, order) => ({
            name,
            type: 'string',
            nullCount: 0,
            uniqueCount: 0,
            sampleValues: [],
            min: null,
            max: null,
            selected: selectedSet ? selectedSet.has(name) : true,
            outputName: name,
            order
        })),
        geometryType: null,
        featureCount: 0,
        crs: 'EPSG:4326'
    };
}

/**
 * Union field names from multiple scan results.
 * @param {Array<{ fields?: string[] }>} scans
 */
export function mergeScanFieldNames(scans) {
    const set = new Set();
    for (const scan of scans || []) {
        for (const name of scan?.fields || []) {
            if (name) set.add(name);
        }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
}

export default {
    shouldFilterFields,
    filterProperties,
    filterFeatureProperties,
    filterFeaturesProperties,
    filterTableRow,
    applySelectedFieldsToSchema,
    filterDatasetBySelectedFields,
    filterImportResult,
    arcgisOutFieldsParam,
    buildImportFieldSchema,
    mergeScanFieldNames
};
