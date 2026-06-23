/**
 * GeoJSON exporter — supports workspace-backed layers via batched read.
 */
import { withBakedSimpleStyle } from './style-baker.js';
import { isWorkspaceLayer } from '../core/data-model.js';
import { iterateWorkspaceFeatures } from '../workspace/workspace-store.js';

const EXPORT_BATCH_SIZE = 500;

function _cleanFeatureProperties(styled, layerStyle) {
    return Object.fromEntries(
        Object.entries(styled.properties || {}).filter(([k]) => {
            if (k === '_thumbnailDataUrl') return true;
            return !k.startsWith('_');
        }).map(([k, v]) => [k === '_thumbnailDataUrl' ? 'photo' : k, v])
    );
}

function _mapFeatureForExport(f, layerStyle) {
    const styled = layerStyle ? withBakedSimpleStyle(f, layerStyle) : f;
    return {
        ...styled,
        properties: _cleanFeatureProperties(styled, layerStyle)
    };
}

async function _exportWorkspaceGeoJSON(dataset, layerStyle, options, task) {
    const layerId = dataset.workspaceLayerId || dataset.id;
    const parts = ['{"type":"FeatureCollection","features":['];
    let first = true;
    let offset = 0;
    let total = 0;

    while (true) {
        const batch = await iterateWorkspaceFeatures(layerId, offset, EXPORT_BATCH_SIZE);
        if (!batch.length) break;
        for (const f of batch) {
            const out = _mapFeatureForExport(f, layerStyle);
            parts.push(first ? '' : ',', JSON.stringify(out));
            first = false;
            total++;
        }
        offset += batch.length;
        task?.updateProgress(30 + Math.min(55, Math.round((offset / Math.max(offset + 1000, 1)) * 55)), `Exporting… ${total.toLocaleString()} features`);
        if (batch.length < EXPORT_BATCH_SIZE) break;
    }

    parts.push(']}');
    task?.updateProgress(90, 'Done');
    const text = options.minify ? parts.join('') : parts.join('').replace(/},\{/g, '},\n{');
    return { text, mimeType: 'application/geo+json' };
}

export async function exportGeoJSON(dataset, options = {}, task) {
    const layerStyle = options.style || null;

    if (isWorkspaceLayer(dataset)) {
        return _exportWorkspaceGeoJSON(dataset, layerStyle, options, task);
    }

    const source = dataset.geojson || {
        type: 'FeatureCollection',
        features: (dataset.rows || []).map(r => ({
            type: 'Feature', geometry: null, properties: r
        }))
    };

    const featureCount = source.features?.length || 0;
    if (featureCount > EXPORT_BATCH_SIZE && !options.minify) {
        const parts = ['{\n  "type": "FeatureCollection",\n  "features": [\n'];
        for (let i = 0; i < featureCount; i++) {
            const out = _mapFeatureForExport(source.features[i], layerStyle);
            parts.push(i === 0 ? '    ' : ',\n    ', JSON.stringify(out));
            if (i % EXPORT_BATCH_SIZE === 0) {
                task?.updateProgress(30 + Math.round((i / featureCount) * 55), `Exporting… ${i.toLocaleString()}/${featureCount.toLocaleString()}`);
                await new Promise((r) => setTimeout(r, 0));
            }
        }
        parts.push('\n  ]\n}');
        task?.updateProgress(90, 'Done');
        return { text: parts.join(''), mimeType: 'application/geo+json' };
    }

    const geojson = {
        ...source,
        features: source.features.map((f) => _mapFeatureForExport(f, layerStyle))
    };

    const text = JSON.stringify(geojson, null, options.minify ? 0 : 2);
    task?.updateProgress(90, 'Done');
    return { text, mimeType: 'application/geo+json' };
}

export default { exportGeoJSON };
