/**
 * Coverage raster exporters — KMZ GroundOverlays and georeferenced PNG zip.
 */
import { AppError, ErrorCategory } from '../core/error-handler.js';
import { loadJSZip } from '../core/libs.js';
import { escapeXml } from './kml-exporter.js';
import {
    buildWorldFileFromBbox,
    dataUrlToBytes,
    getCoverageRasters,
    sanitizeCoverageExportName
} from '../core/coverage-raster-layer.js';

function rasterFileName(raster, index, layerSlug) {
    const poleId = sanitizeCoverageExportName(raster.poleId ?? `pole-${index + 1}`);
    return `${layerSlug}-pole-${poleId}.png`;
}

function kmzFileName(raster, index) {
    const poleId = sanitizeCoverageExportName(raster.poleId ?? `pole-${index + 1}`);
    return `coverage-${poleId}.png`;
}

function buildGroundOverlayXml(raster, href, name) {
    const [west, south, east, north] = raster.bbox || [];
    if (![west, south, east, north].every((v) => Number.isFinite(v))) return '';

    return `    <GroundOverlay>
      <name>${escapeXml(name)}</name>
      <Icon>
        <href>${escapeXml(href)}</href>
      </Icon>
      <LatLonBox>
        <north>${north}</north>
        <south>${south}</south>
        <east>${east}</east>
        <west>${west}</west>
      </LatLonBox>
    </GroundOverlay>`;
}

/**
 * Build KML folder + embedded file list for one coverage raster layer.
 * @param {object} dataset
 * @param {object[]} rasters
 * @param {{ forKmzArchive?: boolean, layerSlug?: string }} [options]
 */
export function buildCoverageKmlParts(dataset, rasters, options = {}) {
    const layerName = dataset.name || 'Wireless Signal Coverage';
    const layerSlug = options.layerSlug || sanitizeCoverageExportName(layerName);
    const overlays = [];
    const files = [];

    rasters.forEach((raster, index) => {
        const bytes = dataUrlToBytes(raster.dataUrl);
        if (!bytes) return;

        const kmzName = kmzFileName(raster, index);
        const href = options.forKmzArchive ? `files/${kmzName}` : kmzName;
        const overlayName = raster.poleId
            ? `${layerName} — ${raster.poleId}`
            : `${layerName} — ${index + 1}`;

        overlays.push(buildGroundOverlayXml(raster, href, overlayName));
        files.push({ name: kmzName, bytes });
    });

    const folderXml = overlays.length
        ? `    <Folder>
      <name>${escapeXml(layerName)}</name>
${overlays.join('\n')}
    </Folder>`
        : '';

    return { folderXml, files, layerSlug };
}

/**
 * @param {object} dataset
 * @param {object} [options]
 * @param {object} [task]
 */
export async function exportCoverageKMZ(dataset, options = {}, task) {
    const JSZipLib = await loadJSZip();
    if (!JSZipLib) {
        throw new AppError('JSZip library not loaded', ErrorCategory.PARSE_FAILED);
    }

    const rasters = getCoverageRasters(dataset);
    if (!rasters.length) {
        throw new AppError('No coverage raster images to export', ErrorCategory.PARSE_FAILED);
    }

    task?.updateProgress(20, 'Building coverage overlays...');
    const { folderXml, files } = buildCoverageKmlParts(dataset, rasters, { forKmzArchive: true });
    if (!files.length) {
        throw new AppError('Coverage raster images could not be decoded', ErrorCategory.PARSE_FAILED);
    }

    const docName = options.filename || dataset.name || 'Coverage Export';
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(docName)}</name>
${folderXml}
  </Document>
</kml>`;

    task?.updateProgress(60, 'Creating KMZ archive...');
    const zip = new JSZipLib();
    const filesFolder = zip.folder('files');
    for (const file of files) {
        filesFolder.file(file.name, file.bytes);
    }
    zip.file('doc.kml', kml);

    task?.updateProgress(80, 'Compressing...');
    const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });

    task?.updateProgress(100, 'Done');
    return { blob };
}

/**
 * @param {object} dataset
 * @param {object} [options]
 * @param {object} [task]
 */
export async function exportCoverageRasterZip(dataset, options = {}, task) {
    const JSZipLib = await loadJSZip();
    if (!JSZipLib) {
        throw new AppError('JSZip library not loaded', ErrorCategory.PARSE_FAILED);
    }

    const rasters = getCoverageRasters(dataset);
    if (!rasters.length) {
        throw new AppError('No coverage raster images to export', ErrorCategory.PARSE_FAILED);
    }

    const layerSlug = sanitizeCoverageExportName(options.filename || dataset.name || 'coverage');
    task?.updateProgress(20, 'Packing georeferenced PNGs...');

    const zip = new JSZipLib();
    const manifest = [];

    for (let i = 0; i < rasters.length; i++) {
        const raster = rasters[i];
        const bytes = dataUrlToBytes(raster.dataUrl);
        if (!bytes) continue;

        const pngName = rasterFileName(raster, i, layerSlug);
        const pgwName = pngName.replace(/\.png$/i, '.pgw');
        const pgw = buildWorldFileFromBbox(raster.bbox, raster.width, raster.height);

        zip.file(pngName, bytes);
        zip.file(pgwName, pgw);

        manifest.push({
            file: pngName,
            worldFile: pgwName,
            poleId: raster.poleId ?? `pole-${i + 1}`,
            bbox: raster.bbox,
            coordinates: raster.coordinates,
            width: raster.width,
            height: raster.height
        });

        task?.updateProgress(
            20 + Math.round(((i + 1) / rasters.length) * 55),
            `Packed ${i + 1}/${rasters.length}`
        );
    }

    if (!manifest.length) {
        throw new AppError('Coverage raster images could not be decoded', ErrorCategory.PARSE_FAILED);
    }

    zip.file('coverage-manifest.json', JSON.stringify({
        layerName: dataset.name || layerSlug,
        crs: 'EPSG:4326',
        rasters: manifest
    }, null, 2));

    task?.updateProgress(85, 'Compressing...');
    const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });

    task?.updateProgress(100, 'Done');
    return { blob };
}

/**
 * Multi-layer KMZ with coverage raster folders + embedded PNGs.
 * @param {Array<{dataset, style}>} coverageLayers
 * @param {Array<{dataset, style}>} vectorLayers
 * @param {object} [options]
 * @param {object} [task]
 */
export async function exportMixedCoverageMultiLayerKMZ(coverageLayers, vectorLayers, options = {}, task) {
    const JSZipLib = await loadJSZip();
    if (!JSZipLib) {
        throw new AppError('JSZip library not loaded', ErrorCategory.PARSE_FAILED);
    }

    const { exportMultiLayerKML } = await import('./kml-exporter.js');

    task?.updateProgress(15, 'Generating multi-layer KML...');

    let kmlText = '';
    if (vectorLayers.length) {
        const kmlResult = await exportMultiLayerKML(vectorLayers, { ...options, forKmzArchive: true }, task);
        kmlText = kmlResult.text;
    }

    const coverageFolders = [];
    const allFiles = [];

    for (const { dataset } of coverageLayers) {
        const rasters = getCoverageRasters(dataset);
        const { folderXml, files } = buildCoverageKmlParts(dataset, rasters, { forKmzArchive: true });
        if (folderXml) coverageFolders.push(folderXml);
        allFiles.push(...files);
    }

    if (coverageFolders.length) {
        const docName = options.filename || 'Multi-Layer Export';
        if (kmlText) {
            kmlText = kmlText.replace(
                '</Document>',
                `${coverageFolders.join('\n')}\n  </Document>`
            );
        } else {
            kmlText = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(docName)}</name>
${coverageFolders.join('\n')}
  </Document>
</kml>`;
        }
    }

    task?.updateProgress(60, 'Creating KMZ archive...');
    const zip = new JSZipLib();
    if (allFiles.length) {
        const filesFolder = zip.folder('files');
        for (const file of allFiles) {
            filesFolder.file(file.name, file.bytes);
        }
    }
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

export default {
    buildCoverageKmlParts,
    exportCoverageKMZ,
    exportCoverageRasterZip,
    exportMixedCoverageMultiLayerKMZ
};
