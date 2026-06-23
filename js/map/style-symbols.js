/**
 * Prepare MapLibre symbol layers for smart styling with custom point symbols.
 */
import { getBaseFlatStyle } from './style-engine.js';

/**
 * Collect icon registrations needed for a style.
 * @param {object} style
 * @param {'point'|'line'|'polygon'} geometryKind
 * @returns {Array<{ fieldValue: string|null, strokeColor: string, fillColor: string, size: number, opacity: number, symbol: string }>}
 */
export function collectSymbolVariants(style, geometryKind) {
    if (geometryKind !== 'point') return [];
    const base = getBaseFlatStyle(style, geometryKind);
    if (base.pointSymbol === 'circle') return [];

    const variants = new Map();
    const add = (fieldValue, strokeColor, fillColor) => {
        const key = `${fieldValue ?? '__default__'}|${strokeColor}|${fillColor}`;
        if (!variants.has(key)) {
            variants.set(key, {
                fieldValue,
                strokeColor,
                fillColor,
                size: base.pointSize,
                opacity: Math.min(1, base.fillOpacity + 0.3),
                symbol: base.pointSymbol
            });
        }
    };

    add(null, base.strokeColor, base.fillColor);

    if (style.mode !== 'smart') return [...variants.values()];

    for (const vv of style.smart?.visualVariables || []) {
        if (vv.type !== 'unique') continue;
        const target = vv.geometryTarget || 'all';
        if (target !== 'all' && target !== 'point') continue;
        for (const cls of vv.classes || []) {
            const color = cls.color || cls.style?.fillColor || vv.defaultColor || base.fillColor;
            add(String(cls.value), cls.style?.strokeColor || color, color);
        }
        if (vv.defaultColor) add('__other__', vv.defaultColor, vv.defaultColor);
    }

    return [...variants.values()];
}

/**
 * @param {object} style
 * @param {'point'|'line'|'polygon'} geometryKind
 * @param {(shape: string, stroke: string, fill: string, size: number, opacity: number) => string} ensureImage
 * @returns {{ layout: object, defaultImage: string }|null}
 */
export function buildSymbolLayerLayout(style, geometryKind, ensureImage) {
    const base = getBaseFlatStyle(style, geometryKind);
    if (base.pointSymbol === 'circle') return null;

    const variants = collectSymbolVariants(style, geometryKind);
    const defaultImage = ensureImage(base.pointSymbol, base.strokeColor, base.fillColor, base.pointSize, Math.min(1, base.fillOpacity + 0.3));

    const uniqueVv = style.mode === 'smart'
        ? style.smart?.visualVariables?.find((vv) => vv.type === 'unique' && (vv.geometryTarget || 'all') !== 'line' && (vv.geometryTarget || 'all') !== 'polygon')
        : null;

    if (!uniqueVv || !uniqueVv.classes?.length) {
        return {
            layout: {
                'icon-image': defaultImage,
                'icon-size': 1,
                'icon-allow-overlap': true,
                'icon-anchor': base.pointSymbol === 'pin' ? 'bottom' : 'center'
            },
            defaultImage
        };
    }

    const field = uniqueVv.field;
    const pairs = [];
    for (const cls of uniqueVv.classes) {
        const fill = cls.color || cls.style?.fillColor || uniqueVv.defaultColor || base.fillColor;
        const stroke = cls.style?.strokeColor || fill;
        const img = ensureImage(base.pointSymbol, stroke, fill, base.pointSize, Math.min(1, base.fillOpacity + 0.3));
        pairs.push(String(cls.value), img);
    }
    const fallback = ensureImage(
        base.pointSymbol,
        uniqueVv.defaultColor || base.strokeColor,
        uniqueVv.defaultColor || base.fillColor,
        base.pointSize,
        Math.min(1, base.fillOpacity + 0.3)
    );

    return {
        layout: {
            'icon-image': ['match', ['coalesce', ['to-string', ['get', field]], ''], ...pairs, fallback],
            'icon-size': 1,
            'icon-allow-overlap': true,
            'icon-anchor': base.pointSymbol === 'pin' ? 'bottom' : 'center'
        },
        defaultImage: fallback
    };
}
