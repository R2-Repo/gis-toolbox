import bus from '../../core/event-bus.js';
import { openReactIsland } from '../../ui/open-react-island.js';
import { nearestPointOnRouteLine } from '../../tools/line-geojson.js';
import { getSpatialLayerOptions } from '../widget-context.js';
import {
    UNIT_LABELS,
    WORKFLOW_OPTIONS,
    SCENARIO_OPTIONS,
    DIRECTION_OPTIONS,
    DEFAULT_SLACK_SETTINGS,
    IDEAL_DATA_HELP_TEXT,
    NEAR_LINE_FT,
    buildRouteFromSelection,
    runCalculatorWorkflow,
    computePlotOnMapResult,
    computeClickOnMapResult,
    buildOutputFeatureCollection
} from './engine.js';

const OUTPUT_LAYER_NAME = 'Fiber Slack OTDR Result';

function clearPreview(ctx, state) {
    ctx.mapService.removeTempFeature?.(state.previewEntry);
    ctx.mapService.clearTempFeatures?.();
    state.previewEntry = null;
}

function showPreview(ctx, state, geojson) {
    clearPreview(ctx, state);
    state.previewEntry = ctx.mapService.showTempFeature(geojson, 0);
}

function resolveSelectedLineFeatures(ctx, layerId) {
    const layer = ctx.getLayers().find((entry) => entry.id === layerId);
    if (!layer?.geojson?.features?.length) {
        throw new Error('Selected layer has no features.');
    }

    const selectedIndices = ctx.mapService.getSelectedIndices(layer.id) || [];
    let features;

    if (selectedIndices.length > 0) {
        features = selectedIndices
            .map((idx) => layer.geojson.features.find((f) => f.properties?._featureIndex === idx))
            .filter(Boolean);
    } else if (layer.geojson.features.length === 1) {
        features = [layer.geojson.features[0]];
    } else {
        throw new Error('Select at least one line feature on the map.');
    }

    const lineFeatures = features.filter((f) => {
        const t = f.geometry?.type;
        return t === 'LineString' || t === 'MultiLineString';
    });

    if (!lineFeatures.length) {
        throw new Error('Selected features must be lines.');
    }

    const sourceFeatureIds = lineFeatures
        .map((f) => f.properties?._featureIndex ?? f.properties?.id ?? f.properties?.FID)
        .filter((v) => v != null);

    return { layer, features: lineFeatures, sourceFeatureIds };
}

function buildRouteContext(ctx, input) {
    const { layer, features, sourceFeatureIds } = resolveSelectedLineFeatures(ctx, input.layerId);
    const route = buildRouteFromSelection(features, input.direction);
    if (!route.ok) {
        throw new Error(route.error || 'Could not build route from selection.');
    }

    return {
        layer,
        features,
        sourceFeatureIds,
        routeLine: route.routeLine,
        routeLengthFt: route.routeLengthFt,
        warnings: route.warnings || []
    };
}

function normalizeSlackSettings(raw = {}) {
    return {
        ...DEFAULT_SLACK_SETTINGS,
        ...raw,
        manualSlackLocations: raw.manualSlackLocations === '' || raw.manualSlackLocations == null
            ? null
            : Number(raw.manualSlackLocations)
    };
}

export async function openFiberSlackOtdrHelper(ctx) {
    const previewState = { previewEntry: null };

    const cleanup = () => {
        ctx.mapService.cancelInteraction?.();
        clearPreview(ctx, previewState);
    };

    await openReactIsland({
        title: 'Fiber Slack / OTDR Helper',
        width: '560px',
        mountPath: '../../../react/widgets/mountFiberSlackOtdrHelperDialog.jsx',
        mountExport: 'mountFiberSlackOtdrHelperDialog',
        getProps: (close) => ({
            layers: getSpatialLayerOptions(ctx, { requireLines: true, includeSelectionCount: true }),
            unitOptions: UNIT_LABELS,
            workflowOptions: WORKFLOW_OPTIONS,
            scenarioOptions: SCENARIO_OPTIONS,
            directionOptions: DIRECTION_OPTIONS,
            defaultSlackSettings: DEFAULT_SLACK_SETTINGS,
            idealDataHelpText: IDEAL_DATA_HELP_TEXT,
            onCancel: () => {
                cleanup();
                close();
            },
            onCancelMapInteraction: cleanup,
            onLayerFocus: (layerId) => {
                if (!layerId) return;
                ctx.setActiveLayer?.(layerId);
                ctx.mapService.setActiveLayerId?.(layerId);
                ctx.refreshUI();
            },
            onSubscribeSelection: (layerId, callback) => {
                const refresh = () => callback(ctx.mapService.getSelectionCount(layerId) || 0);
                refresh();
                const handler = () => refresh();
                bus.on('selection:changed', handler);
                return () => bus.off('selection:changed', handler);
            },
            onRunCalculator: (input) => {
                return runCalculatorWorkflow({
                    inputDistance: input.inputDistance,
                    inputUnit: input.inputUnit,
                    inputType: input.calculatorInputType,
                    slackSettings: normalizeSlackSettings(input.slackSettings),
                    scenario: input.scenario
                });
            },
            onRunPlotOnMap: (input) => {
                const routeCtx = buildRouteContext(ctx, input);
                const slackSettings = normalizeSlackSettings(input.slackSettings);
                const output = computePlotOnMapResult({
                    routeLine: routeCtx.routeLine,
                    routeLengthFt: routeCtx.routeLengthFt,
                    inputDistance: input.inputDistance,
                    inputUnit: input.inputUnit,
                    slackSettings,
                    scenario: input.scenario,
                    direction: input.direction,
                    sourceLayer: routeCtx.layer.name,
                    sourceFeatureIds: routeCtx.sourceFeatureIds
                });

                if (output.ok && output.result) {
                    const fc = buildOutputFeatureCollection(output.result);
                    showPreview(ctx, previewState, fc);
                    if (routeCtx.warnings.length) {
                        output.warnings = [...(output.warnings || []), ...routeCtx.warnings];
                        output.result.warnings = output.warnings;
                    }
                }

                return output;
            },
            onPickPointOnMap: async (input) => {
                const routeCtx = buildRouteContext(ctx, input);
                const slackSettings = normalizeSlackSettings(input.slackSettings);

                const click = await ctx.mapService.startPointPick('Click a point on the selected fiber route');
                if (!click) {
                    return { ok: false, errors: ['Map pick cancelled.'] };
                }

                const snap = nearestPointOnRouteLine(
                    ctx.turf.point(click),
                    routeCtx.routeLine,
                    'feet'
                );
                const nearLineDistanceFt = Number(snap.properties?.dist ?? Infinity);
                const clickLocationFt = Number(snap.properties?.location ?? 0);

                const output = computeClickOnMapResult({
                    routeLine: routeCtx.routeLine,
                    routeLengthFt: routeCtx.routeLengthFt,
                    clickLocationFt,
                    nearLineDistanceFt,
                    slackSettings,
                    scenario: input.scenario,
                    direction: input.direction,
                    sourceLayer: routeCtx.layer.name,
                    sourceFeatureIds: routeCtx.sourceFeatureIds
                });

                if (output.ok && output.result) {
                    const fc = buildOutputFeatureCollection(output.result);
                    showPreview(ctx, previewState, fc);
                    if (routeCtx.warnings.length) {
                        output.warnings = [...(output.warnings || []), ...routeCtx.warnings];
                        output.result.warnings = output.warnings;
                    }
                }

                return output;
            },
            onCreateResultLayer: (result) => {
                if (!result) {
                    ctx.showToast('No result to add', 'warning');
                    return;
                }

                const fc = buildOutputFeatureCollection(result);
                if (!fc.features.length) {
                    ctx.showToast('No output features to add', 'warning');
                    return;
                }

                clearPreview(ctx, previewState);

                const dataset = ctx.createSpatialDataset(
                    OUTPUT_LAYER_NAME,
                    fc,
                    { format: 'derived' }
                );
                ctx.addLayer(dataset);
                ctx.mapService.addLayer(dataset, ctx.getLayers().indexOf(dataset), { fit: true });
                ctx.setActiveLayer?.(dataset.id);
                ctx.refreshUI();
                ctx.showToast('Fiber Slack OTDR result layer created.', 'success');
            }
        })
    });
}
