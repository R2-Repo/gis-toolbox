import { ArcGISRestImporter, esriFeatureToGeoJSON } from '../../arcgis/rest-importer.js';
import { AppError, ErrorCategory } from '../../core/error-handler.js';
import { UDOT_ROUTE_SEGMENT_CONFIG } from './config.js';
import { buildRouteIdWhere, buildSelectedRouteWhere } from './engine.js';

const importerCache = new Map();

function getImporter(url) {
    const clean = url.replace(/\/+$/, '').split('?')[0];
    if (!importerCache.has(clean)) {
        importerCache.set(clean, new ArcGISRestImporter());
    }
    return importerCache.get(clean);
}

/**
 * @param {string} url
 */
export async function fetchLayerMetadata(url) {
    const importer = getImporter(url);
    return importer.fetchMetadata(url);
}

/**
 * @param {object} metadata
 * @param {string[]} requiredFields
 */
export function validateLayerFields(metadata, requiredFields) {
    const available = new Set((metadata?.fields || []).map((field) => field.name));
    const missing = requiredFields.filter((name) => !available.has(name));
    if (missing.length > 0) {
        throw new AppError(
            `ArcGIS layer "${metadata?.name || 'layer'}" is missing expected fields: ${missing.join(', ')}`,
            ErrorCategory.PARSE_FAILED,
            { missing, url: metadata?.url }
        );
    }
}

/**
 * @param {typeof UDOT_ROUTE_SEGMENT_CONFIG} config
 */
export async function validateWidgetLayerConfig(config = UDOT_ROUTE_SEGMENT_CONFIG) {
    const [routeMeta, wholeMeta, tenthMeta] = await Promise.all([
        fetchLayerMetadata(config.routeLayerUrl),
        fetchLayerMetadata(config.milepostWholeLayerUrl),
        fetchLayerMetadata(config.milepostTenthLayerUrl)
    ]);

    validateLayerFields(routeMeta, [
        config.routeAliasField,
        config.routeIdField,
        config.routeDirectionField,
        config.routeTypeField,
        config.cartoCodeField
    ]);
    validateLayerFields(wholeMeta, [
        config.milepostRouteIdField,
        config.milepostValueField
    ]);
    validateLayerFields(tenthMeta, [
        config.milepostRouteIdField,
        config.milepostValueField
    ]);

    return { routeMeta, wholeMeta, tenthMeta };
}

/**
 * Lightweight ArcGIS query — never bulk-imports layers.
 * @param {string} url
 * @param {object} options
 */
export async function queryFeatures(url, options = {}) {
    const importer = getImporter(url);
    if (!importer.getMetadata()) {
        await importer.fetchMetadata(url);
    }

    const metadata = importer.getMetadata();
    const maxRec = metadata.maxRecordCount || 1000;
    const {
        where = '1=1',
        outFields = '*',
        returnGeometry = true,
        resultRecordCount = maxRec,
        orderByFields = '',
        resultOffset = 0
    } = options;

    const params = new URLSearchParams({
        where,
        outFields: Array.isArray(outFields) ? outFields.join(',') : outFields,
        returnGeometry: String(returnGeometry),
        f: 'json',
        resultOffset: String(resultOffset),
        resultRecordCount: String(Math.min(resultRecordCount, maxRec)),
        outSR: '4326'
    });

    if (orderByFields) {
        params.set('orderByFields', orderByFields);
    }

    const response = await fetch(`${metadata.url}/query?${params.toString()}`, {
        signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
        throw new AppError(
            `ArcGIS query failed with HTTP ${response.status}`,
            ErrorCategory.HTTP_4XX,
            { url: metadata.url, where }
        );
    }

    const data = await response.json();
    if (data.error) {
        throw new AppError(
            data.error.message || 'ArcGIS query returned an error',
            ErrorCategory.PARSE_FAILED,
            { url: metadata.url, where, error: data.error }
        );
    }

    const convert = (geom) => importer.convertGeometry(geom);
    const features = (data.features || []).map((feature) =>
        esriFeatureToGeoJSON(feature, convert)
    );

    return {
        features,
        exceededTransferLimit: Boolean(data.exceededTransferLimit),
        fields: data.fields || metadata.fields || []
    };
}

/**
 * Paginate until all matching features are retrieved.
 * @param {string} url
 * @param {object} options
 */
export async function queryAllFeatures(url, options = {}) {
    const importer = getImporter(url);
    if (!importer.getMetadata()) {
        await importer.fetchMetadata(url);
    }
    const metadata = importer.getMetadata();
    const pageSize = metadata.maxRecordCount || 1000;
    const allFeatures = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        const page = await queryFeatures(url, {
            ...options,
            resultRecordCount: pageSize,
            resultOffset: offset
        });
        allFeatures.push(...page.features);
        hasMore = page.exceededTransferLimit && page.features.length > 0;
        offset += page.features.length;
        if (page.features.length === 0) break;
    }

    return allFeatures;
}

/**
 * @param {string} where
 * @param {typeof UDOT_ROUTE_SEGMENT_CONFIG} config
 */
export async function searchRoutes(where, config = UDOT_ROUTE_SEGMENT_CONFIG) {
    const result = await queryFeatures(config.routeLayerUrl, {
        where,
        outFields: config.routeSearchOutFields,
        returnGeometry: false,
        resultRecordCount: config.routeSearchLimit,
        orderByFields: config.routeAliasField
    });
    return result.features.map((feature) => feature.properties || {});
}

/**
 * @param {string} routeId
 * @param {typeof UDOT_ROUTE_SEGMENT_CONFIG} config
 * @param {string} [direction]
 */
export async function queryRouteFeaturesById(routeId, config = UDOT_ROUTE_SEGMENT_CONFIG, direction = null) {
    const where = direction
        ? buildSelectedRouteWhere(routeId, direction, config)
        : buildRouteIdWhere(routeId, config);
    return queryAllFeatures(config.routeLayerUrl, {
        where,
        outFields: config.routeGeometryOutFields,
        returnGeometry: true
    });
}

/**
 * @param {string} where
 * @param {'whole'|'tenth'} layerKey
 * @param {typeof UDOT_ROUTE_SEGMENT_CONFIG} config
 */
export async function queryMilepostFeatures(where, layerKey, config = UDOT_ROUTE_SEGMENT_CONFIG) {
    const url = layerKey === 'whole'
        ? config.milepostWholeLayerUrl
        : config.milepostTenthLayerUrl;
    return queryAllFeatures(url, {
        where,
        outFields: config.milepostOutFields,
        returnGeometry: true,
        orderByFields: config.milepostValueField
    });
}

/**
 * Verify direction codes exist on the route layer.
 * @param {typeof UDOT_ROUTE_SEGMENT_CONFIG} config
 */
export async function verifyDirectionValues(config = UDOT_ROUTE_SEGMENT_CONFIG) {
    const posWhere = `${config.routeDirectionField} = '${String(config.positiveDirectionValue).replace(/'/g, "''")}'`;
    const negWhere = `${config.routeDirectionField} = '${String(config.negativeDirectionValue).replace(/'/g, "''")}'`;

    const [positive, negative] = await Promise.all([
        queryFeatures(config.routeLayerUrl, {
            where: posWhere,
            outFields: [config.routeDirectionField],
            returnGeometry: false,
            resultRecordCount: 1
        }),
        queryFeatures(config.routeLayerUrl, {
            where: negWhere,
            outFields: [config.routeDirectionField],
            returnGeometry: false,
            resultRecordCount: 1
        })
    ]);

    return {
        positiveFound: positive.features.length > 0,
        negativeFound: negative.features.length > 0
    };
}
