/**
 * Resolve CRS metadata for imported datasets that need user confirmation.
 */
import { isSpatialLayer } from '../core/data-model.js';
import { buildCrsWarning, isDisplayReady } from '../crs/detect.js';
import { normalizeCrsCode } from '../crs/registry.js';

/**
 * @param {object[]} datasets
 * @param {(opts: object) => Promise<string|null>} pickCrs - modal callback
 */
export async function resolveImportCrsForDatasets(datasets, pickCrs) {
    if (!pickCrs) return datasets;

    for (const ds of datasets) {
        if (!isSpatialLayer(ds)) continue;
        const crs = ds.schema?.crs;
        if (crs && crs !== 'UNKNOWN') continue;
        if (!ds.source?.crsWarning && crs !== 'UNKNOWN') continue;

        const picked = await pickCrs({
            layerName: ds.name,
            message: ds.source?.crsWarning,
            defaultCrs: 'EPSG:6337'
        });

        if (picked) {
            const normalized = normalizeCrsCode(picked);
            ds.schema.crs = normalized;
            ds.source.crsDetected = 'user';
            if (isDisplayReady(normalized)) {
                delete ds.source.crsWarning;
            } else {
                ds.source.crsWarning = buildCrsWarning(normalized);
            }
        }
    }

    return datasets;
}
