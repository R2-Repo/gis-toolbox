import { openReactIsland } from '../../ui/open-react-island.js';
import { getSpatialLayerOptions } from '../widget-context.js';
import {
    UNIT_LABELS,
    buildPreviewGeojson,
    buildWirelessPlanningOutputLayers,
    createDefaultPoleSectorAttributes,
    normalizeClientPoints,
    normalizePolePoints,
    runGreedyPoleSectorOptimization,
    validateWirelessPlanningInputs
} from './engine.js';

function getLayerFeatures(ctx, layerId) {
    const layer = ctx.getLayers().find((l) => l.id === layerId);
    return layer?.geojson?.features || [];
}

function resolveFeatures(sourceMode, layerId, drawnFeatures, ctx) {
    if (sourceMode === 'draw') return drawnFeatures || [];
    return getLayerFeatures(ctx, layerId);
}

function buildValidationStats(features, type, settings = {}) {
    if (type === 'clients') {
        const norm = normalizeClientPoints(features);
        return {
            total: norm.total,
            valid: norm.valid.length,
            invalid: norm.invalid.length
        };
    }
    const norm = normalizePolePoints(features, {
        defaultRange: settings.defaultRange,
        defaultWidth: settings.defaultSectorWidth,
        units: settings.units
    });
    return {
        total: norm.total,
        valid: norm.valid.length,
        invalid: norm.invalid.length,
        polesWithExistingAttrs: norm.withExistingAttrs,
        polesUsingDefaults: norm.usingDefaults
    };
}

function addDerivedLayer(ctx, name, fc, options = {}) {
    const dataset = ctx.createSpatialDataset(name, fc, {
        format: 'derived',
        widget: 'wireless-site-planning',
        ...(options.source || {})
    });
    ctx.addLayer(dataset);
    const index = ctx.getLayers().indexOf(dataset);
    ctx.mapService.addLayer(dataset, index, { fit: options.fit ?? false, style: options.style });
    if (options.style) {
        ctx.mapService.setLayerStyle?.(dataset.id, options.style);
        ctx.mapService.restyleLayer?.(dataset.id, dataset, options.style);
    }
    ctx.refreshUI();
    return dataset;
}

function buildRunPayload(ctx, config) {
    const clientFeatures = resolveFeatures(
        config.clientSourceMode,
        config.clientLayerId,
        config.drawnClients,
        ctx
    );
    const poleFeatures = resolveFeatures(
        config.poleSourceMode,
        config.poleLayerId,
        config.drawnPoles,
        ctx
    );

    const validation = validateWirelessPlanningInputs({
        clients: clientFeatures,
        poles: poleFeatures,
        settings: config.settings
    });

    if (validation.errors.length) {
        throw new Error(validation.errors[0]);
    }

    return {
        clients: validation.clientNorm.valid,
        poles: validation.poleNorm.valid,
        validation
    };
}

export async function openWirelessSitePlanning(ctx) {
    let previewHandle = null;

    const clearPreview = () => {
        ctx.mapService.showTempFeature?.(null, 0);
        previewHandle = null;
    };

    await openReactIsland({
        title: 'Wireless Site Planning',
        width: '560px',
        mountPath: '../../../react/widgets/mountWirelessSitePlanningDialog.jsx',
        mountExport: 'mountWirelessSitePlanningDialog',
        getProps: (close) => ({
            layers: getSpatialLayerOptions(ctx, { includeFields: true, requirePoints: true }),
            unitOptions: UNIT_LABELS.map((entry) => ({
                value: entry.value,
                label: `${entry.label} (${entry.abbr})`
            })),
            onCancel: () => {
                clearPreview();
                ctx.mapService.cancelInteraction?.();
                close();
            },
            onValidateClients: async ({ sourceMode, layerId, drawnFeatures }) => {
                const features = resolveFeatures(sourceMode, layerId, drawnFeatures, ctx);
                return buildValidationStats(features, 'clients');
            },
            onValidatePoles: async ({ sourceMode, layerId, drawnFeatures, settings }) => {
                const features = resolveFeatures(sourceMode, layerId, drawnFeatures, ctx);
                return buildValidationStats(features, 'poles', settings);
            },
            onDrawClientPoint: async () => {
                ctx.mapService.cancelInteraction?.();
                const coord = await ctx.mapService.startPointPick('Click the map to add a client location');
                if (!coord) return null;
                const index = Date.now();
                return {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: coord },
                    properties: {
                        id: `drawn-client-${index}`,
                        name: `Client ${index}`,
                        coverage_status: 'unknown'
                    }
                };
            },
            onDrawPolePoint: async ({ settings = {} } = {}) => {
                ctx.mapService.cancelInteraction?.();
                const coord = await ctx.mapService.startPointPick('Click the map to add a pole location');
                if (!coord) return null;
                const index = Date.now();
                const defaults = createDefaultPoleSectorAttributes(
                    parseFloat(settings.defaultRange) || 1,
                    parseFloat(settings.defaultSectorWidth) || 90,
                    settings.units || 'miles'
                );
                return {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: coord },
                    properties: {
                        id: `drawn-pole-${index}`,
                        name: `Pole ${index}`,
                        ...defaults
                    }
                };
            },
            onRun: async (config) => {
                const { clients, poles, validation } = buildRunPayload(ctx, config);
                const settings = config.settings || {};

                const result = runGreedyPoleSectorOptimization(clients, poles, {
                    defaultRange: settings.defaultRange,
                    defaultSectorWidth: settings.defaultSectorWidth,
                    sectorWidthMode: settings.sectorWidthMode,
                    maxAntennasPerPole: settings.maxAntennasPerPole,
                    optimizationGoal: settings.optimizationGoal,
                    units: settings.units
                });

                const previewGeojson = buildPreviewGeojson(result, {
                    units: settings.units,
                    createAssignmentLines: settings.createAssignmentLines
                });

                clearPreview();
                ctx.mapService.showTempFeature?.(previewGeojson, 0);
                previewHandle = { clear: clearPreview };

                ctx.showToast?.(
                    `Covered ${result.summary.coveredClients} of ${result.summary.totalClients} locations (${result.summary.coveragePercent}%)`,
                    'success'
                );

                return {
                    ...result,
                    warnings: validation.warnings,
                    settings
                };
            },
            onCreateOutputs: async (result, options = {}) => {
                const settings = options.settings || result.settings || {};
                const layers = buildWirelessPlanningOutputLayers(result, {
                    units: settings.units,
                    createAssignmentLines: options.createAssignmentLines ?? settings.createAssignmentLines
                });

                let created = 0;
                const layerDefs = [
                    { name: 'Wireless Recommended Poles', fc: layers.recommendedPoles, style: { mode: 'simple', fillColor: '#f97316', strokeColor: '#f97316' } },
                    { name: 'Wireless Sector Coverage', fc: layers.sectorCoverage, style: { mode: 'simple', fillColor: '#3b82f6', strokeColor: '#2563eb', fillOpacity: 0.25 } },
                    { name: 'Wireless Covered Clients', fc: layers.coveredClients, style: { mode: 'simple', fillColor: '#22c55e', strokeColor: '#16a34a' } },
                    { name: 'Wireless Uncovered Clients', fc: layers.uncoveredClients, style: { mode: 'simple', fillColor: '#ef4444', strokeColor: '#dc2626' } }
                ];

                if (options.createAssignmentLines && layers.clientAssignments.features.length) {
                    layerDefs.push({
                        name: 'Wireless Client Assignments',
                        fc: layers.clientAssignments,
                        style: { mode: 'simple', strokeColor: '#94a3b8', strokeWidth: 2 }
                    });
                }

                layerDefs.forEach((def) => {
                    if (def.fc.features.length) {
                        addDerivedLayer(ctx, def.name, def.fc, {
                            fit: created === 0,
                            style: def.style
                        });
                        created++;
                    }
                });

                if (!created) {
                    throw new Error('No output features to create.');
                }

                ctx.showToast?.(`Created ${created} wireless planning layer${created === 1 ? '' : 's'}.`, 'success');
            }
        })
    });
}
