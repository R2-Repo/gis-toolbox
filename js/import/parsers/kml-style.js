/**
 * Extract unified KML style from feature properties (toGeoJSON output).
 */
export function extractKmlStyleFromFeatures(features) {
    let strokeColor = null;
    let fillColor = null;
    let strokeWidth = null;
    let strokeOpacity = null;
    let fillOpacity = null;

    for (const f of features) {
        const p = f.properties || {};
        if (!strokeColor && p.stroke) strokeColor = p.stroke;
        if (!fillColor && p.fill) fillColor = p.fill;
        if (strokeWidth == null && p['stroke-width'] != null) strokeWidth = parseFloat(p['stroke-width']);
        if (strokeOpacity == null && p['stroke-opacity'] != null) strokeOpacity = parseFloat(p['stroke-opacity']);
        if (fillOpacity == null && p['fill-opacity'] != null) fillOpacity = parseFloat(p['fill-opacity']);
        if (strokeColor && fillColor && strokeWidth != null && strokeOpacity != null && fillOpacity != null) break;
    }

    if (!strokeColor && !fillColor && strokeWidth == null) return null;

    const style = {};
    if (strokeColor) style.strokeColor = strokeColor;
    if (fillColor) style.fillColor = fillColor;
    else if (strokeColor) style.fillColor = strokeColor;
    if (strokeWidth != null && !isNaN(strokeWidth)) {
        style.strokeWidth = strokeWidth > 0 ? strokeWidth : 1;
    }
    if (strokeOpacity != null && !isNaN(strokeOpacity) && strokeOpacity > 0) {
        style.strokeOpacity = strokeOpacity;
    }
    if (fillOpacity != null && !isNaN(fillOpacity)) style.fillOpacity = fillOpacity;
    return style;
}

export default extractKmlStyleFromFeatures;
