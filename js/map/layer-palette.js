/** Default categorical colors for layer styling (import smart-style, style panel). */
export const LAYER_COLOR_PALETTE = [
    '#2563eb', '#dc2626', '#16a34a', '#d97706',
    '#7c3aed', '#0891b2', '#be185d', '#65a30d'
];

export function getLayerDefaultColor(layerIndex = 0) {
    return LAYER_COLOR_PALETTE[Math.max(0, layerIndex) % LAYER_COLOR_PALETTE.length];
}
