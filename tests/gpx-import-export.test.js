import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { DOMParser } from '@xmldom/xmldom';
import toGeoJSON from '@mapbox/togeojson';
import togpx from 'togpx';
import { parseGpxText } from '../js/import/parsers/parse-gpx.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const samplePath = path.join(__dirname, 'fixtures', 'sample.gpx');
const sampleText = readFileSync(samplePath, 'utf8');

describe('GPX import/export', () => {
    test('parseGpxText converts tracks and waypoints to GeoJSON', () => {
        const { geojson } = parseGpxText(sampleText, {
            DOMParserImpl: DOMParser,
            toGeoJsonLib: toGeoJSON
        });

        expect(geojson.type).toBe('FeatureCollection');
        expect(geojson.features.length).toBeGreaterThanOrEqual(2);

        const names = geojson.features.map((f) => f.properties?.name).filter(Boolean);
        expect(names).toContain('Seattle');
        expect(names).toContain('Sample Track');

        const geometries = geojson.features.map((f) => f.geometry?.type);
        expect(geometries).toContain('Point');
        expect(geometries).toContain('LineString');
    });

    test('togpx round-trips parsed GeoJSON back to GPX XML', () => {
        const { geojson } = parseGpxText(sampleText, {
            DOMParserImpl: DOMParser,
            toGeoJsonLib: toGeoJSON
        });

        const gpxText = togpx(geojson, { creator: 'GIS Toolbox' });
        expect(gpxText).toContain('<gpx');
        expect(gpxText).toContain('lat="');
        expect(gpxText).toContain('lon="');
    });

    test('parseGpxText rejects non-GPX XML', () => {
        expect(() => parseGpxText('<root><item/></root>', {
            DOMParserImpl: DOMParser,
            toGeoJsonLib: toGeoJSON
        })).toThrow(/does not appear to be GPX/i);
    });
});
