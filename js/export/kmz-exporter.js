/**
 * KMZ exporter — zip of KML + optionally images, with styling & folders
 */
import { AppError, ErrorCategory } from '../core/error-handler.js';
import { loadJSZip } from '../core/libs.js';
import { exportKML, exportMultiLayerKML, geometryToKML, escapeXml } from './kml-exporter.js';
import { kmlUsesMilepostIcon } from './kml-milepost-style.js';
import { getMilepostDotBytes } from './milepost-dot-png.js';

export async function exportKMZ(dataset, options = {}, task) {
    const JSZipLib = await loadJSZip();
    if (!JSZipLib) {
        throw new AppError('JSZip library not loaded', ErrorCategory.PARSE_FAILED);
    }

    task?.updateProgress(20, 'Generating KML...');

    // Photo mode: embed images in KMZ
    if (options.photos && options.photos.length > 0) {
        const result = await buildPhotoKMZ(dataset, options, task);
        return result;
    }

    // Standard KMZ
    const kmlResult = await exportKML(dataset, { ...options, forKmzArchive: true });
    let kmlText = kmlResult.text;

    task?.updateProgress(60, 'Creating KMZ archive...');
    const zip = new JSZipLib();

    // Embed attachment files from attachment fields
    const attachments = _collectAttachments(dataset);
    if (attachments.length > 0) {
        task?.updateProgress(65, `Embedding ${attachments.length} attachment(s)...`);
        const filesFolder = zip.folder('files');
        for (const att of attachments) {
            const blob = _dataUrlToBlob(att.dataUrl);
            if (blob) {
                filesFolder.file(att.zipName, blob);
                kmlText = _replaceDataUrlWithZipPath(kmlText, att.dataUrl, `files/${att.zipName}`);
            }
        }
    }

    _embedMilepostIcon(zip, kmlText);

    zip.file('doc.kml', kmlText);

    task?.updateProgress(80, 'Compressing...');
    const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });

    task?.updateProgress(100, 'Done');
    return { blob };
}

async function buildPhotoKMZ(dataset, options, task) {
    const JSZipLib = await loadJSZip();
    const zip = new JSZipLib();
    const imgFolder = zip.folder('images');
    const photos = options.photos || [];
    const features = dataset.geojson?.features || [];

    task?.updateProgress(30, 'Embedding images...');

    // Build placemarks with embedded image references
    const placemarks = [];
    for (let i = 0; i < features.length; i++) {
        const f = features[i];
        const photo = photos[i];
        if (!f.geometry) continue;

        task?.updateProgress(30 + Math.round((i / features.length) * 40), `Embedding image ${i + 1}/${features.length}`);

        const name = f.properties?.filename || f.properties?.name || `Photo ${i + 1}`;
        let imgRef = '';

        if (photo?.blob) {
            const ext = photo.filename?.split('.').pop()?.toLowerCase() || 'jpg';
            const imgName = `img_${i}.${ext}`;

            if (options.embedThumbnails !== false && photo.thumbnail) {
                imgFolder.file(imgName, photo.thumbnail);
            } else {
                imgFolder.file(imgName, photo.blob);
            }
            imgRef = `<img src="images/${imgName}" style="max-width:400px;max-height:400px;" /><br/>`;
        }

        const desc = `${imgRef}${buildDescTable(f.properties)}`;
        const geomKml = geometryToKML(f.geometry);

        placemarks.push(`    <Placemark>
      <name>${escapeXml(String(name))}</name>
      <description><![CDATA[${desc}]]></description>
      ${geomKml}
    </Placemark>`);
    }

    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(dataset.name || 'Photo Export')}</name>
${placemarks.join('\n')}
  </Document>
</kml>`;

    zip.file('doc.kml', kml);

    task?.updateProgress(85, 'Compressing KMZ...');
    const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });

    task?.updateProgress(100, 'Done');
    return { blob };
}

/**
 * Multi-layer KMZ — each layer is a <Folder> with its own style.
 * @param {Array<{dataset, style}>} layers
 */
export async function exportMultiLayerKMZ(layers, options = {}, task) {
    const JSZipLib = await loadJSZip();
    if (!JSZipLib) {
        throw new AppError('JSZip library not loaded', ErrorCategory.PARSE_FAILED);
    }

    task?.updateProgress(20, 'Generating multi-layer KML...');
    const kmlResult = await exportMultiLayerKML(layers, { ...options, forKmzArchive: true }, task);

    task?.updateProgress(60, 'Creating KMZ archive...');
    const zip = new JSZipLib();
    let kmlText = kmlResult.text;

    // Embed attachments from all layers
    const allAttachments = [];
    for (const { dataset } of layers) {
        allAttachments.push(..._collectAttachments(dataset));
    }
    if (allAttachments.length > 0) {
        task?.updateProgress(65, `Embedding ${allAttachments.length} attachment(s)...`);
        const filesFolder = zip.folder('files');
        for (const att of allAttachments) {
            const blob = _dataUrlToBlob(att.dataUrl);
            if (blob) {
                filesFolder.file(att.zipName, blob);
                kmlText = _replaceDataUrlWithZipPath(kmlText, att.dataUrl, `files/${att.zipName}`);
            }
        }
    }

    _embedMilepostIcon(zip, kmlText);

    zip.file('doc.kml', kmlText);

    task?.updateProgress(80, 'Compressing...');
    const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });

    task?.updateProgress(100, 'Done');
    return { blob };
}

function _embedMilepostIcon(zip, kmlText) {
    if (!kmlUsesMilepostIcon(kmlText)) return;
    const filesFolder = zip.folder('files');
    filesFolder.file('milepost-dot.png', getMilepostDotBytes(), { binary: true });
}

/**
 * Replace a data URL only in common KML embedding contexts (src=, <href>) to avoid corrupting other text.
 */
function _replaceDataUrlWithZipPath(kmlText, dataUrl, zipPath) {
    const esc = dataUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let out = kmlText.replace(new RegExp(`src="${esc}"`, 'g'), `src="${zipPath}"`);
    out = out.replace(new RegExp(`<href>\\s*${esc}\\s*</href>`, 'gi'), `<href>${zipPath}</href>`);
    return out;
}

/**
 * Collect all attachment field values from a dataset's features.
 * Returns array of { dataUrl, zipName, fieldName } for embedding in KMZ.
 */
function _collectAttachments(dataset) {
    const attachments = [];
    const features = dataset.geojson?.features || [];
    let idx = 0;
    for (const f of features) {
        const props = f.properties || {};
        for (const [key, val] of Object.entries(props)) {
            if (val && typeof val === 'object' && val._att && val.dataUrl) {
                const ext = val.name?.split('.').pop()?.toLowerCase() || 'bin';
                const zipName = `att_${idx++}_${(val.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                attachments.push({ dataUrl: val.dataUrl, zipName, fieldName: key, name: val.name });
            }
        }
    }
    return attachments;
}

/**
 * Convert a data URL to a Blob for ZIP embedding.
 */
function _dataUrlToBlob(dataUrl) {
    try {
        const [header, b64] = dataUrl.split(',');
        const mime = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: mime });
    } catch { return null; }
}

function buildDescTable(props) {
    if (!props) return '';
    const cellVal = (v) => {
        if (v && typeof v === 'object' && v._att) return null;
        if (v != null && typeof v === 'object') {
            try {
                return JSON.stringify(v);
            } catch {
                return '(object)';
            }
        }
        return String(v);
    };
    return '<table>' + Object.entries(props)
        .filter(([k, v]) => v != null && v !== '' && !k.startsWith('_'))
        .map(([k, v]) => {
            if (v && typeof v === 'object' && v._att) {
                return `<tr><td><b>${escapeXml(k)}</b></td><td>📎 ${escapeXml(v.name || 'attachment')}</td></tr>`;
            }
            return `<tr><td><b>${escapeXml(k)}</b></td><td>${escapeXml(cellVal(v))}</td></tr>`;
        })
        .join('') + '</table>';
}
