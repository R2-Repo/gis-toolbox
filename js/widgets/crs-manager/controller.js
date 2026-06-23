import { openReactIsland } from '../../ui/open-react-island.js';
import { getSpatialLayerOptions } from '../widget-context.js';
import {
    auditLayers,
    buildBatchReprojectPlan,
    getAvailablePresets,
    getMapDisplayTargetPresets,
    loadCrsFavorites,
    saveCrsFavorites,
    validateCustomWkt,
    validateLayerForReproject
} from './engine.js';
import { registerWkt } from '../../crs/registry.js';
import { reprojectLayer } from '../../tools/reproject.js';
import {
    hasProjectedCoordinates,
    resolveReprojectFromCrs
} from '../../crs/layer-crs.js';
import { isDisplayReady } from '../../crs/detect.js';
import { materializeSpatialLayer } from '../../tools/gis-layer-context.js';

export async function openCrsManager(ctx) {
    await openReactIsland({
        title: 'CRS Manager',
        width: '620px',
        mountPath: '../../../react/widgets/mountCrsManagerDialog.jsx',
        mountExport: 'mountCrsManagerDialog',
        getProps: (close) => ({
            layers: getSpatialLayerOptions(ctx),
            audit: auditLayers(ctx.getLayers()),
            presets: getAvailablePresets(),
            mapDisplayPresets: getMapDisplayTargetPresets(),
            favorites: loadCrsFavorites(),
            onCancel: close,
            onSaveFavorites: (favorites) => saveCrsFavorites(favorites),
            onRegisterWkt: async (wkt) => {
                const check = validateCustomWkt(wkt);
                if (!check.valid) throw new Error(check.message);
                await registerWkt(check.code, wkt);
                return check.code;
            },
            onReprojectLayers: async (layerIds, targetCrs) => {
                const plan = buildBatchReprojectPlan(layerIds, targetCrs);
                const created = [];
                for (const step of plan) {
                    const layer = ctx.getLayers().find((entry) => entry.id === step.layerId);
                    if (!layer) continue;
                    const materialized = await materializeSpatialLayer(layer);
                    if (!materialized) continue;
                    const fromCrs = resolveReprojectFromCrs(materialized, materialized.geojson);
                    const validation = validateLayerForReproject(
                        materialized,
                        materialized.geojson,
                        fromCrs,
                        step.toCrs
                    );
                    if (!validation.ok) {
                        throw new Error(`"${layer.name}": ${validation.message}`);
                    }

                    const result = await reprojectLayer(materialized, {
                        fromCrs,
                        toCrs: step.toCrs,
                        name: `${layer.name}${step.outputSuffix}`
                    });
                    if (isDisplayReady(step.toCrs) && hasProjectedCoordinates(result.geojson)) {
                        throw new Error(
                            `"${layer.name}": reprojection did not produce map-ready coordinates. Try the original layer, not a broken reproject copy.`
                        );
                    }
                    ctx.addLayer(result);
                    const colorIndex = ctx.getLayers().indexOf(result);
                    const fit = isDisplayReady(step.toCrs);
                    ctx.mapService.addLayer(result, colorIndex, { fit });
                    created.push(result.name);
                }
                ctx.refreshUI();
                if (created.length === 0) {
                    throw new Error('No layers were reprojected.');
                }
                ctx.showToast(`Reprojected ${created.length} layer(s)`, 'success');
                return created;
            }
        })
    });
}
