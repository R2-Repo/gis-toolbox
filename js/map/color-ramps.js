/**
 * Named color palettes for smart styling (categorical, sequential, diverging).
 */

/** @type {Record<string, string[]>} */
export const COLOR_RAMPS = {
    categorical: [
        '#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed',
        '#0891b2', '#be185d', '#65a30d', '#ea580c', '#4f46e5',
        '#0d9488', '#c026d3', '#ca8a04', '#0284c7', '#e11d48',
        '#059669', '#9333ea', '#d946ef', '#f97316', '#6366f1'
    ],
    ylOrRd: ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#bd0026', '#800026'],
    blues: ['#eff3ff', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'],
    greens: ['#edf8e9', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#006d2c', '#00441b'],
    reds: ['#fee5d9', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d'],
    purples: ['#f2f0f7', '#dadaeb', '#bcbddc', '#9e9ac8', '#807dba', '#6a51a3', '#54278f', '#3f007d'],
    viridis: ['#440154', '#482777', '#3f4a8a', '#31678e', '#26838f', '#1f9d8a', '#6cce5a', '#b6de2b', '#fee825'],
    rdYlGn: ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837']
};

/**
 * @param {string} rampName
 * @returns {string[]}
 */
export function getRampColors(rampName) {
    return COLOR_RAMPS[rampName] || COLOR_RAMPS.ylOrRd;
}

/**
 * Pick evenly spaced colors from a ramp for N classes.
 * @param {string} rampName
 * @param {number} count
 * @returns {string[]}
 */
export function sampleRamp(rampName, count) {
    const ramp = getRampColors(rampName);
    if (count <= 0) return [];
    if (count === 1) return [ramp[ramp.length - 1]];
    const out = [];
    for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0 : i / (count - 1);
        const idx = Math.round(t * (ramp.length - 1));
        out.push(ramp[idx]);
    }
    return out;
}

/**
 * @param {number} count
 * @returns {string[]}
 */
export function getCategoricalColors(count) {
    const base = COLOR_RAMPS.categorical;
    const out = [];
    for (let i = 0; i < count; i++) {
        out.push(base[i % base.length]);
    }
    return out;
}

export const RAMP_OPTIONS = [
    { id: 'ylOrRd', label: 'Yellow → Red' },
    { id: 'blues', label: 'Blues' },
    { id: 'greens', label: 'Greens' },
    { id: 'reds', label: 'Reds' },
    { id: 'purples', label: 'Purples' },
    { id: 'viridis', label: 'Viridis' },
    { id: 'rdYlGn', label: 'Red → Yellow → Green' }
];
