/**
 * Decide standard vs optimizer import route based on crash-risk signals (not file size alone).
 */
import { detectFormat } from './importer.js';
import { formatBytes, preflightFile } from './import-preflight.js';
import {
    estimateImportPeakBytes,
    sniffCoordinateCountEstimate,
    sniffFeatureCountEstimate
} from './import-memory-budget.js';
import { WORKSPACE_FEATURE_THRESHOLD } from '../workspace/workspace-store.js';

/** Estimated peak memory above this → Import Optimizer (below 24 MB reject). */
export const OPTIMIZER_PEAK_BYTES = 16 * 1024 * 1024;

/** Coordinate sniff above this → Optimizer (below 2M reject). */
export const OPTIMIZER_COORDINATE_THRESHOLD = 500_000;

/** KMZ/KML file size above this may suggest heavy embedded assets. */
export const KML_HEAVY_BYTES = 4 * 1024 * 1024;

export const ROUTE_REASON = {
    FEATURE_COUNT: 'feature_count',
    PEAK_MEMORY: 'peak_memory',
    COORDINATE_DENSITY: 'coordinate_density',
    KML_HEAVY: 'kml_heavy'
};

const KML_FORMATS = new Set(['kml', 'kmz', 'xml']);

function _isKmlFamily(format) {
    return format != null && KML_FORMATS.has(format);
}

/**
 * Assess one file using optional precomputed scan row.
 * @param {File} file
 * @param {object|null} scan
 * @returns {Promise<{ reasons: string[], featureEstimate: number|null, peakBytes: number, useWorkspace: boolean }>}
 */
export async function assessFileImportRisk(file, scan = null) {
    const format = scan?.format ?? detectFormat(file);
    const featureEstimate = scan?.featureEstimate ?? await sniffFeatureCountEstimate(file);
    const peakBytes = scan?.estimatedPeakBytes ?? estimateImportPeakBytes(file);
    const reasons = [];

    if (featureEstimate != null && featureEstimate >= WORKSPACE_FEATURE_THRESHOLD) {
        reasons.push(ROUTE_REASON.FEATURE_COUNT);
    }
    if (peakBytes >= OPTIMIZER_PEAK_BYTES) {
        reasons.push(ROUTE_REASON.PEAK_MEMORY);
    }

    const coordEstimate = scan?.coordinateEstimate ?? await sniffCoordinateCountEstimate(file);
    if (coordEstimate != null && coordEstimate >= OPTIMIZER_COORDINATE_THRESHOLD) {
        reasons.push(ROUTE_REASON.COORDINATE_DENSITY);
    }

    if (_isKmlFamily(format) && (file.size ?? 0) >= KML_HEAVY_BYTES) {
        reasons.push(ROUTE_REASON.KML_HEAVY);
    }

    const useWorkspace = featureEstimate != null && featureEstimate >= WORKSPACE_FEATURE_THRESHOLD;

    return { reasons, featureEstimate, peakBytes, useWorkspace, format };
}

/**
 * @param {File[]} files
 * @param {{ scans?: Array<object> }} [options]
 * @returns {Promise<{
 *   route: 'standard' | 'optimizer',
 *   reasons: string[],
 *   useWorkspace: boolean,
 *   notice: object|null,
 *   showProgressNotice: boolean,
 *   fileRisks: Array<object>
 * }>}
 */
export async function assessImportRoute(files, options = {}) {
    const scans = options.scans || [];
    const scanByName = new Map(scans.map((s) => [s.fileName, s]));

    const fileRisks = [];
    const allReasons = new Set();

    for (const file of files || []) {
        const scan = scanByName.get(file.name) || null;
        const risk = await assessFileImportRisk(file, scan);
        fileRisks.push({ fileName: file.name, ...risk });
        for (const r of risk.reasons) allReasons.add(r);
    }

    const reasons = [...allReasons];
    const route = reasons.length > 0 ? 'optimizer' : 'standard';
    const useWorkspace = fileRisks.some((r) => r.useWorkspace);

    return {
        route,
        reasons,
        useWorkspace,
        showProgressNotice: route === 'optimizer' && useWorkspace,
        fileRisks
    };
}

/**
 * Whether post-parse workspace conversion should run.
 * @param {number} featureCount
 * @param {{ useWorkspace?: boolean }} [importOpts]
 */
export function shouldConvertToWorkspace(featureCount, importOpts = {}) {
    if (importOpts.useWorkspace === true) return true;
    return (featureCount ?? 0) >= WORKSPACE_FEATURE_THRESHOLD;
}

/**
 * ArcGIS spatial download — workspace only when feature count warrants it.
 * @param {number|null|undefined} totalCount
 * @param {{ spatialFilter?: unknown }} [queryOpts]
 */
export function arcgisShouldUseWorkspace(totalCount, queryOpts = {}) {
    if (queryOpts.spatialFilter) return true;
    const count = Number(totalCount);
    if (!Number.isFinite(count) || count <= 0) return false;
    return count >= WORKSPACE_FEATURE_THRESHOLD;
}

/** Quick check if scans already contain enough info to route without re-sniffing. */
export function assessImportRouteFromScans(scans) {
    const reasons = new Set();
    let useWorkspace = false;

    for (const scan of scans || []) {
        const feat = scan.featureEstimate;
        if (feat != null && feat >= WORKSPACE_FEATURE_THRESHOLD) {
            reasons.add(ROUTE_REASON.FEATURE_COUNT);
            useWorkspace = true;
        }
        const peak = scan.estimatedPeakBytes ?? 0;
        if (peak >= OPTIMIZER_PEAK_BYTES) reasons.add(ROUTE_REASON.PEAK_MEMORY);
        const coord = scan.coordinateEstimate;
        if (coord != null && coord >= OPTIMIZER_COORDINATE_THRESHOLD) {
            reasons.add(ROUTE_REASON.COORDINATE_DENSITY);
        }
        if (_isKmlFamily(scan.format) && (scan.sizeBytes ?? 0) >= KML_HEAVY_BYTES) {
            reasons.add(ROUTE_REASON.KML_HEAVY);
        }
    }

    const reasonList = [...reasons];
    const route = reasonList.length > 0 ? 'optimizer' : 'standard';
    return {
        route,
        reasons: reasonList,
        useWorkspace,
        showProgressNotice: route === 'optimizer' && useWorkspace
    };
}

export default {
    OPTIMIZER_PEAK_BYTES,
    OPTIMIZER_COORDINATE_THRESHOLD,
    KML_HEAVY_BYTES,
    ROUTE_REASON,
    assessFileImportRisk,
    assessImportRoute,
    assessImportRouteFromScans,
    shouldConvertToWorkspace,
    arcgisShouldUseWorkspace
};
