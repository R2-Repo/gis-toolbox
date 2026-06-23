/** Map rendering budgets — prevent OOM from oversized GeoJSON sources. */
export const RENDER_LIMITS = {
    maxFeaturesPerSource: 10_000,
    maxVerticesPerViewport: 250_000,
    maxPropertiesOnMap: 5,
    maxActiveSources: 20
};

export const MAP_CHUNK_BATCH_SIZE = 5000;

export default { RENDER_LIMITS, MAP_CHUNK_BATCH_SIZE };
