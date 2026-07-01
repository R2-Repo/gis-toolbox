import { describe, expect, it } from 'vitest';
import { ANNOTATION_TYPES, buildAnnotationLayerSpecs } from '../js/map/map-annotations.js';
import {
    ANNOTATION_SCREEN_LIFT_PX,
    collectAnnotationRenderItems,
    liftedLabelPoint
} from '../js/map/annotation-overlay.js';

describe('map-annotations billboard layout', () => {
    it('uses viewport pitch and rotation on symbol layers for 3D-safe labels', () => {
        const features = [{
            type: 'Feature',
            properties: {
                _annotationType: ANNOTATION_TYPES.TEXT,
                text: 'Test',
                _featureIndex: 0
            },
            geometry: { type: 'Point', coordinates: [0, 0] }
        }];

        const spec = buildAnnotationLayerSpecs('layer-1', 'src-layer-1', features);
        const symbolLayer = spec.layers.find((l) => l.id === 'layer-1-ann-labels');

        expect(symbolLayer.layout['text-pitch-alignment']).toBe('viewport');
        expect(symbolLayer.layout['text-rotation-alignment']).toBe('viewport');
    });

    it('uses viewport pitch on callout anchor circles', () => {
        const features = [{
            type: 'Feature',
            properties: {
                _annotationType: ANNOTATION_TYPES.CALLOUT,
                text: 'Building',
                _featureIndex: 0
            },
            geometry: {
                type: 'LineString',
                coordinates: [[0, 0], [1, 1]]
            }
        }];

        const spec = buildAnnotationLayerSpecs('layer-2', 'src-layer-2', features);
        const anchorLayer = spec.layers.find((l) => l.id === 'layer-2-ann-anchor');

        expect(anchorLayer.paint['circle-pitch-alignment']).toBe('viewport');
    });
});

describe('annotation-overlay screen projection', () => {
    it('lifts label pixels above ground projection', () => {
        const ground = { x: 100, y: 200 };
        const label = liftedLabelPoint(ground, 36);
        expect(label).toEqual({ x: 100, y: 164 });
    });

    it('builds callout items with straight screen anchor and lifted label', () => {
        const map = {
            project: ([lng, lat]) => ({ x: lng * 10, y: lat * 10 })
        };
        const features = [{
            type: 'Feature',
            properties: {
                _annotationType: ANNOTATION_TYPES.CALLOUT,
                text: 'Peak',
                leaderColor: '#333333',
                leaderWidth: 2
            },
            geometry: {
                type: 'LineString',
                coordinates: [[10, 20], [30, 40]]
            }
        }];

        const items = collectAnnotationRenderItems(map, features, ANNOTATION_SCREEN_LIFT_PX);
        expect(items).toHaveLength(1);
        expect(items[0].anchor).toEqual({ x: 100, y: 200 });
        expect(items[0].label).toEqual({ x: 300, y: 364 });
    });
});
