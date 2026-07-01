import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import {
    buildWorldFileFromBbox,
    dataUrlToBlob,
    isCoverageRasterLayer,
    rehydrateCoverageRasters,
    stripCoverageRasterDataUrls
} from '../js/core/coverage-raster-layer.js';
import { getAvailableFormats } from '../js/export/exporter.js';
import {
    buildCoverageKmlParts,
    exportCoverageKMZ,
    exportCoverageRasterZip
} from '../js/export/coverage-raster-exporter.js';

const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const MOCK_RASTER = {
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
};

const MOCK_COVERAGE_LAYER = {
    id: 'cov-layer-1',
    name: 'Wireless Signal Coverage',
    type: 'spatial',
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
    schema: { geometryType: 'Polygon', fields: [] },
    source: {
        coverageType: 'raster',
        coverageRasters: [MOCK_RASTER]
    }
};

const noopTask = { updateProgress: () => {} };

describe('coverage raster layer helpers', () => {
    it('detects coverage raster layers', () => {
        expect(isCoverageRasterLayer(MOCK_COVERAGE_LAYER)).toBe(true);
        expect(isCoverageRasterLayer({ type: 'spatial', source: {} })).toBe(false);
    });

    it('builds world file lines from bbox and dimensions', () => {
        const pgw = buildWorldFileFromBbox(MOCK_RASTER.bbox, 64, 64);
        const lines = pgw.split('\n');
        expect(lines).toHaveLength(6);
        expect(Number(lines[0])).toBeCloseTo(0.02 / 64, 8);
        expect(Number(lines[3])).toBeLessThan(0);
    });

    it('strips dataUrl from raster metadata', () => {
        const stripped = stripCoverageRasterDataUrls([MOCK_RASTER]);
        expect(stripped[0].file).toBe('0.png');
        expect(stripped[0].dataUrl).toBeUndefined();
        expect(stripped[0].poleId).toBe('pole-1');
    });

    it('rehydrates rasters from sidecar blobs', async () => {
        const blob = dataUrlToBlob(PNG_DATA_URL);
        const metadata = stripCoverageRasterDataUrls([MOCK_RASTER]);
        const restored = await rehydrateCoverageRasters(metadata, { '0.png': blob });
        expect(restored).toHaveLength(1);
        expect(restored[0].dataUrl).toMatch(/^data:image\/png;base64,/);
        expect(restored[0].bbox).toEqual(MOCK_RASTER.bbox);
    });
});

describe('coverage raster export formats', () => {
    it('offers coverage-specific formats for raster layers', () => {
        const formats = getAvailableFormats(MOCK_COVERAGE_LAYER);
        const keys = formats.map((f) => f.key);
        expect(keys).toContain('coverage-kmz');
        expect(keys).toContain('coverage-raster');
        expect(keys).toContain('geojson');
        expect(keys).not.toContain('shapefile');
        expect(keys).not.toContain('kmz');
    });

    it('builds GroundOverlay KML parts with LatLonBox', () => {
        const { folderXml, files } = buildCoverageKmlParts(MOCK_COVERAGE_LAYER, [MOCK_RASTER], {
            forKmzArchive: true
        });
        expect(folderXml).toContain('<GroundOverlay>');
        expect(folderXml).toContain('<north>40.01</north>');
        expect(folderXml).toContain('<west>-111.01</west>');
        expect(files).toHaveLength(1);
        expect(files[0].name).toBe('coverage-pole-1.png');
    });

    it('exports KMZ archive with doc.kml and embedded PNG', async () => {
        const { blob } = await exportCoverageKMZ(MOCK_COVERAGE_LAYER, {}, noopTask);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const kml = await zip.file('doc.kml').async('string');
        expect(kml).toContain('GroundOverlay');
        expect(zip.file('files/coverage-pole-1.png')).toBeTruthy();
    });

    it('exports georeferenced PNG zip with manifest and world file', async () => {
        const { blob } = await exportCoverageRasterZip(MOCK_COVERAGE_LAYER, {}, noopTask);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const manifestRaw = await zip.file('coverage-manifest.json').async('string');
        const manifest = JSON.parse(manifestRaw);
        expect(manifest.rasters).toHaveLength(1);
        expect(manifest.crs).toBe('EPSG:4326');

        const pngName = manifest.rasters[0].file;
        const pgwName = manifest.rasters[0].worldFile;
        expect(zip.file(pngName)).toBeTruthy();
        expect(zip.file(pgwName)).toBeTruthy();
        const pgw = await zip.file(pgwName).async('string');
        expect(pgw.split('\n')).toHaveLength(6);
    });
});
