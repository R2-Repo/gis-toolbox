import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import {
    buildProjectKitSnapshot,
    packProjectKit,
    parseProjectKit
} from '../js/core/project-kit.js';
import { buildDatasetFromSavedLayer } from '../js/core/layer-restore.js';

const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const MOCK_COVERAGE_LAYER = {
    id: 'cov-layer-1',
    name: 'Wireless Signal Coverage',
    type: 'spatial',
    visible: true,
    created: '2026-01-01T00:00:00.000Z',
    geojson: {
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [-111.01, 39.99],
                    [-110.99, 39.99],
                    [-110.99, 40.01],
                    [-111.01, 40.01],
                    [-111.01, 39.99]
                ]]
            },
            properties: { coverage_shape: 'coverage_raster_bounds', pole_id: 'pole-1' }
        }]
    },
    schema: {
        geometryType: 'Polygon',
        featureCount: 1,
        fields: [{ name: 'pole_id', type: 'string' }]
    },
    source: {
        format: 'derived',
        widget: 'wireless-site-planning',
        coverageType: 'raster',
        coverageRasters: [{
            poleId: 'pole-1',
            bbox: [-111.01, 39.99, -110.99, 40.01],
            coordinates: [
                [-111.01, 40.01],
                [-110.99, 40.01],
                [-110.99, 39.99],
                [-111.01, 39.99]
            ],
            width: 64,
            height: 64,
            dataUrl: PNG_DATA_URL
        }]
    }
};

describe('project kit coverage raster round-trip', () => {
    it('packs raster PNG sidecars and keeps index free of inline dataUrls', async () => {
        const snapshot = await buildProjectKitSnapshot({
            sections: ['layers'],
            layers: [MOCK_COVERAGE_LAYER],
            activeLayerId: MOCK_COVERAGE_LAYER.id,
            layerStyles: {}
        });

        expect(snapshot.layers.rasters[MOCK_COVERAGE_LAYER.id]).toHaveLength(1);

        const indexEntry = snapshot.layers.index[0];
        expect(indexEntry.source.coverageRasterSidecar).toBe(true);
        expect(indexEntry.source.coverageRasters[0].dataUrl).toBeUndefined();
        expect(indexEntry.source.coverageRasters[0].file).toBe('0.png');

        const blob = await packProjectKit(snapshot, JSZip);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        expect(zip.file(`layers/rasters/${MOCK_COVERAGE_LAYER.id}/manifest.json`)).toBeTruthy();
        expect(zip.file(`layers/rasters/${MOCK_COVERAGE_LAYER.id}/0.png`)).toBeTruthy();

        const indexRaw = await zip.file('layers/index.json').async('string');
        expect(indexRaw.includes('data:image/png;base64')).toBe(false);
    });

    it('imports sidecar rasters and rebuilds dataset with dataUrls', async () => {
        const snapshot = await buildProjectKitSnapshot({
            sections: ['layers'],
            layers: [MOCK_COVERAGE_LAYER],
            activeLayerId: MOCK_COVERAGE_LAYER.id,
            layerStyles: {}
        });
        const blob = await packProjectKit(snapshot, JSZip);
        const parsed = await parseProjectKit(await blob.arrayBuffer(), JSZip);

        const saved = parsed.layers.index[0];
        const dataset = await buildDatasetFromSavedLayer(saved, {
            spatial: parsed.layers.spatial[saved.id],
            rasterSidecar: parsed.layers.rasters[saved.id]
        });

        expect(dataset.source.coverageRasters).toHaveLength(1);
        expect(dataset.source.coverageRasters[0].dataUrl).toMatch(/^data:image\/png;base64,/);
        expect(dataset.source.coverageRasters[0].poleId).toBe('pole-1');
        expect(dataset.geojson.features).toHaveLength(1);
    });

    it('supports legacy inline dataUrl kits without sidecar files', async () => {
        const saved = {
            id: MOCK_COVERAGE_LAYER.id,
            name: MOCK_COVERAGE_LAYER.name,
            type: 'spatial',
            visible: true,
            created: MOCK_COVERAGE_LAYER.created,
            source: {
                coverageType: 'raster',
                coverageRasters: [MOCK_COVERAGE_LAYER.source.coverageRasters[0]]
            }
        };

        const dataset = await buildDatasetFromSavedLayer(saved, {
            spatial: MOCK_COVERAGE_LAYER.geojson
        });

        expect(dataset.source.coverageRasters[0].dataUrl).toBe(PNG_DATA_URL);
    });
});
