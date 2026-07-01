/**
 * Shared helpers for wireless coverage raster layers (map display, export, kit sidecars).
 */

/** @param {object|null|undefined} dataset */
export function isCoverageRasterLayer(dataset) {
    if (!dataset?.source) return false;
    if (dataset.source.coverageType === 'raster') return true;
    return Array.isArray(dataset.source.coverageRasters) && dataset.source.coverageRasters.length > 0;
}

/** @param {object|null|undefined} dataset */
export function getCoverageRasters(dataset) {
    if (!isCoverageRasterLayer(dataset)) return [];
    return dataset.source.coverageRasters || [];
}

/**
 * @param {Uint8Array|ArrayBuffer} bytes
 * @param {string} [mime]
 */
export function bytesToDataUrl(bytes, mime = 'image/png') {
    const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let binary = '';
    for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]);
    return `data:${mime};base64,${btoa(binary)}`;
}

/**
 * Convert a data URL to raw bytes for ZIP embedding.
 * @param {string} dataUrl
 * @returns {Uint8Array|null}
 */
export function dataUrlToBytes(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') return null;
    try {
        const [, b64] = dataUrl.split(',');
        if (!b64) return null;
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
    } catch {
        return null;
    }
}

/**
 * Convert a data URL to a Blob for ZIP embedding.
 * @param {string} dataUrl
 */
export function dataUrlToBlob(dataUrl) {
    const bytes = dataUrlToBytes(dataUrl);
    if (!bytes) return null;
    try {
        const [header] = dataUrl.split(',');
        const mime = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
        return new Blob([bytes], { type: mime });
    } catch {
        return null;
    }
}

/**
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export async function blobToDataUrl(blob) {
    if (typeof FileReader !== 'undefined') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read image data'));
            reader.readAsDataURL(blob);
        });
    }

    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const mime = blob.type || 'application/octet-stream';
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return `data:${mime};base64,${btoa(binary)}`;
}

/**
 * Strip dataUrl from rasters for kit index; keep georef metadata + file ref.
 * @param {object[]} rasters
 */
export function stripCoverageRasterDataUrls(rasters = []) {
    return rasters.map((raster, index) => ({
        poleId: raster.poleId ?? `pole-${index + 1}`,
        bbox: raster.bbox,
        coordinates: raster.coordinates,
        width: raster.width,
        height: raster.height,
        file: raster.file || `${index}.png`
    }));
}

/**
 * Rebuild coverageRasters with dataUrls from sidecar PNG blobs.
 * @param {object[]} metadata
 * @param {Record<string, Blob|Uint8Array>} pngBlobsByFile
 */
export async function rehydrateCoverageRasters(metadata = [], pngBlobsByFile = {}) {
    const out = [];
    for (let i = 0; i < metadata.length; i++) {
        const meta = metadata[i];
        if (meta.dataUrl) {
            out.push({ ...meta });
            continue;
        }
        const file = meta.file || `${i}.png`;
        const payload = pngBlobsByFile[file];
        if (!payload) continue;

        let dataUrl;
        if (payload instanceof Uint8Array) {
            dataUrl = bytesToDataUrl(payload, file.endsWith('.png') ? 'image/png' : 'application/octet-stream');
        } else {
            dataUrl = await blobToDataUrl(payload);
        }

        out.push({
            poleId: meta.poleId ?? `pole-${i + 1}`,
            bbox: meta.bbox,
            coordinates: meta.coordinates,
            width: meta.width,
            height: meta.height,
            dataUrl
        });
    }
    return out;
}

/**
 * Build a 6-line ESRI world file (.pgw) from bbox and pixel dimensions.
 * Assumes north-up, unrotated image in WGS84 degrees.
 * @param {number[]} bbox [west, south, east, north]
 * @param {number} width
 * @param {number} height
 */
export function buildWorldFileFromBbox(bbox, width, height) {
    const [west, south, east, north] = bbox;
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    const pixelWidth = (east - west) / w;
    const pixelHeight = (north - south) / h;
    const upperLeftX = west + pixelWidth / 2;
    const upperLeftY = north - pixelHeight / 2;
    return [
        pixelWidth,
        0,
        0,
        -pixelHeight,
        upperLeftX,
        upperLeftY
    ].join('\n');
}

/**
 * Sanitize a string for use in export filenames.
 * @param {string} name
 */
export function sanitizeCoverageExportName(name) {
    return String(name || 'coverage')
        .trim()
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'coverage';
}

export default {
    isCoverageRasterLayer,
    getCoverageRasters,
    bytesToDataUrl,
    dataUrlToBytes,
    dataUrlToBlob,
    blobToDataUrl,
    stripCoverageRasterDataUrls,
    rehydrateCoverageRasters,
    buildWorldFileFromBbox,
    sanitizeCoverageExportName
};
