export const MILEPOST_ICON_COLOR = '#00ff66';
export const MILEPOST_ICON_SCALE = 0.55;
export const MILEPOST_LABEL_SCALE = 0.85;
export const MILEPOST_ICON_HREF_KMZ = 'files/milepost-dot.png';
export const MILEPOST_ICON_HREF_REMOTE =
    'http://maps.google.com/mapfiles/kml/shapes/shaded_dot.png';

const MILEPOST_SOURCE_RE = /Mile_Point_Measures|Mile_Point_Tenth|Federal_Aid_Mile_Point/i;
const MILEPOST_NAME_RE = /milepost|mile post|mile point|mile measure/i;
const MILEPOST_FIELD_RE = /^(measure|milepost|mp|mile_post|mileage)$/i;

/**
 * @param {object} [dataset]
 * @param {object} [style]
 * @param {object[]} [features]
 */
export function isKmlMilepostLayer(dataset, style, features = []) {
    if (dataset?._kmlExport?.milepost) return true;
    if (style?.kmlMilepost) return true;

    const url = String(dataset?.source?.url || dataset?.source?.arcgisUrl || '');
    if (MILEPOST_SOURCE_RE.test(url)) return true;

    const name = String(dataset?.name || dataset?.source?.name || '');
    if (!MILEPOST_NAME_RE.test(name)) return false;

    const sample = features[0]?.properties;
    if (!sample) return true;
    if (_hasMilepostMeasureField(sample)) return true;

    return (features || []).every((f) => {
        const type = f?.geometry?.type;
        return type === 'Point' || type === 'MultiPoint';
    });
}

/**
 * @param {object} feature
 * @param {object} [dataset]
 * @param {object} [style]
 */
export function resolveMilepostPlacemarkName(feature, dataset, style) {
    const props = feature?.properties || {};
    const preferred = dataset?._kmlExport?.labelField || style?.milepostLabelField;
    if (preferred && props[preferred] != null && props[preferred] !== '') {
        return String(props[preferred]);
    }

    for (const [key, value] of Object.entries(props)) {
        if (value == null || value === '' || key.startsWith('_')) continue;
        if (MILEPOST_FIELD_RE.test(key)) return String(value);
    }

    if (props.milepost != null && props.milepost !== '') return String(props.milepost);
    if (props.Measure != null && props.Measure !== '') return String(props.Measure);
    if (props.name != null && props.name !== '') return String(props.name);
    return '';
}

/**
 * @param {boolean} [forKmzArchive]
 */
export function getMilepostIconHref(forKmzArchive = false) {
    return forKmzArchive ? MILEPOST_ICON_HREF_KMZ : MILEPOST_ICON_HREF_REMOTE;
}

export function kmlUsesMilepostIcon(kmlText) {
    return String(kmlText || '').includes(MILEPOST_ICON_HREF_KMZ);
}

function _hasMilepostMeasureField(props) {
    return Object.keys(props).some((key) => {
        if (props[key] == null || props[key] === '') return false;
        return MILEPOST_FIELD_RE.test(key);
    });
}
