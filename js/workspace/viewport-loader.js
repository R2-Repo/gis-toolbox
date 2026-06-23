/**
 * Build viewport GeoJSON packet from workspace chunks.
 */
import { queryWorkspaceChunks, loadWorkspaceChunks } from './workspace-store.js';
import { RENDER_LIMITS } from '../map/render-limits.js';

/**
 * @param {string} layerId
 * @param {[number,number,number,number]} bounds [west,south,east,north]
 * @returns {Promise<{ type: 'FeatureCollection', features: object[] }>}
 */
export async function buildViewportGeoJSON(layerId, bounds) {
    const chunkIds = await queryWorkspaceChunks(bounds, layerId);
    const chunks = await loadWorkspaceChunks(chunkIds);

    const features = [];
    let vertices = 0;

    for (const chunk of chunks) {
        if (features.length >= RENDER_LIMITS.maxFeaturesPerSource) break;
        let fc;
        try {
            fc = JSON.parse(chunk.geojson);
        } catch {
            continue;
        }
        for (const f of fc.features || []) {
            if (features.length >= RENDER_LIMITS.maxFeaturesPerSource) break;
            const v = _countVertices(f.geometry);
            if (vertices + v > RENDER_LIMITS.maxVerticesPerViewport) break;
            vertices += v;
            features.push(f);
        }
    }

    return { type: 'FeatureCollection', features };
}

function _countVertices(geom) {
    if (!geom?.coordinates) return 0;
    let n = 0;
    const visit = (coords) => {
        if (typeof coords[0] === 'number') {
            n++;
            return;
        }
        for (const c of coords) visit(c);
    };
    visit(geom.coordinates);
    return n;
}

export default { buildViewportGeoJSON };
