/**
 * User-facing copy when imports use size-reduction / optimized paths.
 */
import { formatBytes } from './import-preflight.js';
import { WORKSPACE_FEATURE_THRESHOLD } from '../workspace/workspace-store.js';

const REASON = {
    FEATURE_COUNT: 'feature_count',
    PEAK_MEMORY: 'peak_memory',
    COORDINATE_DENSITY: 'coordinate_density',
    KML_HEAVY: 'kml_heavy'
};

/** @param {File|{ name: string, size?: number }} file */
export function formatFileSizeLabel(file) {
    return formatBytes(file?.size ?? 0);
}

/**
 * @param {{ route?: string, reasons?: string[], scans?: object[], fileRisks?: object[] }} assessment
 */
export function buildNoticeForRoute(assessment = {}) {
    const { reasons = [], scans = [] } = assessment;
    if (!reasons.length) return null;

    const fileLines = scans.map((s) => {
        const name = s.fileName || 'File';
        const size = s.sizeLabel || (s.sizeBytes != null ? formatBytes(s.sizeBytes) : '');
        return size ? `${name} (${size})` : name;
    });

    const hasFeatures = reasons.includes(REASON.FEATURE_COUNT);
    const hasPeak = reasons.includes(REASON.PEAK_MEMORY);
    const hasCoords = reasons.includes(REASON.COORDINATE_DENSITY);
    const hasKml = reasons.includes(REASON.KML_HEAVY);

    let heading = 'Optimized import recommended';
    if (hasFeatures && !hasPeak && !hasCoords) {
        heading = 'Large dataset — optimized import';
    } else if (hasPeak && !hasFeatures) {
        heading = 'High memory use expected';
    } else if (hasKml) {
        heading = 'Large KML/KMZ — review import options';
    }

    const introParts = [];
    if (fileLines.length) {
        introParts.push(
            `Importing ${fileLines.length === 1 ? 'this file' : 'these files'} as-is could fail or freeze the browser: ${fileLines.join('; ')}.`
        );
    } else {
        introParts.push('This import may exceed safe browser memory if loaded entirely into RAM.');
    }
    if (hasFeatures) {
        const maxEst = Math.max(
            0,
            ...scans.map((s) => s.featureEstimate ?? 0).filter((n) => n > 0)
        );
        if (maxEst >= WORKSPACE_FEATURE_THRESHOLD) {
            introParts.push(`About ${maxEst.toLocaleString()} features were detected.`);
        }
    }

    const bullets = [];
    if (hasFeatures || hasPeak || hasCoords) {
        bullets.push('Stream features to local storage instead of holding the full dataset in RAM');
        bullets.push('Store only the attributes you select below');
        bullets.push('Render the map from the current viewport (pan/zoom loads more as needed)');
    }
    if (hasKml) {
        bullets.push('Consider GIS mode to strip styling, icons, and embedded assets from KML/KMZ');
    }
    if (hasPeak && !hasFeatures) {
        bullets.push('Estimated memory use is high for a single in-memory import');
    }

    return {
        heading,
        intro: introParts.join(' '),
        planIntro: bullets.length ? 'To import safely, the app will reduce what is kept in memory:' : null,
        bullets,
        footer: 'Review the options below, then continue with the optimized import.'
    };
}

/** @deprecated use buildNoticeForRoute */
export function buildOptimizerReductionNotice(scans = []) {
    return buildNoticeForRoute({
        route: 'optimizer',
        reasons: [REASON.PEAK_MEMORY],
        scans
    });
}

/** @deprecated use buildNoticeForRoute with feature_count reason */
export function buildLargeDatasetNotice(scans = []) {
    return buildNoticeForRoute({
        route: 'optimizer',
        reasons: [REASON.FEATURE_COUNT],
        scans
    });
}

/** @param {{ route?: string, useWorkspace?: boolean }|null|undefined} assessment */
export function shouldShowImportProgressNotice(assessment) {
    if (!assessment) return false;
    return assessment.route === 'optimizer' && assessment.useWorkspace === true;
}

export function buildImportProgressReductionNotice() {
    return 'Using optimized import — streaming data and storing only what you selected.';
}

/**
 * @param {number} featureCount
 */
export function buildArcgisLargeLayerNotice(featureCount) {
    const countLabel = Number(featureCount).toLocaleString();
    return {
        heading: 'Layer too large for a standard import',
        intro: `This ArcGIS layer has ${countLabel} features — too many to load entirely into browser memory at once.`,
        planIntro: 'To import safely, the download will be reduced:',
        bullets: [
            'Stream features to local storage on your device',
            'Store only the attributes you chose',
            'Render the map from the current viewport; pan and zoom to see more',
            'Import may take several minutes'
        ],
        footer: 'Click Continue to start the optimized download.'
    };
}

/**
 * @param {number|null|undefined} featureCount
 */
export function buildArcgisFieldPickerNotice(featureCount) {
    const count = Number(featureCount);
    if (!Number.isFinite(count) || count < WORKSPACE_FEATURE_THRESHOLD) return null;
    if (count >= 250_000) {
        return {
            heading: 'Large ArcGIS layer',
            intro: `This layer has ${count.toLocaleString()} features — too large for a standard in-memory import.`,
            planIntro: 'Select the attributes you need below. On the next step you will confirm an optimized download that streams data to local storage.',
            bullets: [],
            footer: null
        };
    }
    return {
        heading: 'Large layer — optimized import',
        intro: `This layer has ${count.toLocaleString()} features — too many to hold entirely in browser memory.`,
        planIntro: 'After you continue, the import will:',
        bullets: [
            'Download only the attributes you select below',
            'Stream features to local storage',
            'Draw the map from the visible area first'
        ],
        footer: null
    };
}

export function noticeToProgressHint(notice) {
    if (!notice?.intro) return buildImportProgressReductionNotice();
    return notice.intro;
}
