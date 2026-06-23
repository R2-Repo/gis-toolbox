/** UDOT ArcGIS layer URLs and field mappings for Route Centerline widget. */
export const UDOT_ROUTE_SEGMENT_CONFIG = {
    routeLayerUrl: 'https://services.arcgis.com/pA2nEVnB6tquxgOW/ArcGIS/rest/services/UDOT_Routes_ALRS/FeatureServer/0',
    milepostWholeLayerUrl: 'https://roads.udot.utah.gov/server/rest/services/Public/Mile_Point_Measures_Open_Data/MapServer/0',
    milepostTenthLayerUrl: 'https://roads.udot.utah.gov/server/rest/services/Public/Mile_Point_Tenth_Measures_Open_Data/MapServer/0',
    routeAliasField: 'ROUTE_ALIAS_COMMON',
    routeAliasStdDirField: 'ROUTE_ALIAS_STD_DIR',
    routeIdField: 'ROUTE_ID',
    routeDirectionField: 'ROUTE_DIRECTION',
    routeTypeField: 'ROUTE_TYPE',
    routeTypeValue: 'M',
    cartoCodeField: 'CARTO_CODE',
    allowedCartoCodes: ['1', '2', '3', '4'],
    routeLengthField: 'Shape__Length',
    begMileageField: 'BEG_MILEAGE',
    endMileageField: 'END_MILEAGE',
    milepostRouteIdField: 'ROUTE_ID',
    milepostValueField: 'Measure',
    milepostDirectionField: 'RouteDir',
    positiveDirectionValue: 'P',
    negativeDirectionValue: 'N',
    routeSearchLimit: 25,
    milepostTolerance: 0.001,
    /** Max distance (mi) to snap a requested MP to the nearest layer point (tenth-mile grid). */
    milepostSnapTolerance: 0.051,
    /** Max distance (mi) to snap to the nearest whole-mile layer point. */
    milepostWholeSnapTolerance: 0.51,
    routeSearchOutFields: ['ROUTE_ID', 'ROUTE_ALIAS_COMMON', 'ROUTE_ALIAS_STD_DIR', 'ROUTE_DIRECTION'],
    routeGeometryOutFields: ['ROUTE_ID', 'ROUTE_ALIAS_COMMON', 'ROUTE_ALIAS_STD_DIR', 'ROUTE_DIRECTION', 'ROUTE_TYPE', 'Shape__Length', 'BEG_MILEAGE', 'END_MILEAGE'],
    milepostOutFields: ['ROUTE_ID', 'Measure', 'RouteDir', 'ROUTE_ALIAS_COMMON']
};

export const OUTPUT_ALIGNMENT = {
    POSITIVE_CENTERLINE: 'positive_direction_centerline',
    APPROXIMATE_MEDIAN: 'approximate_divided_highway_median'
};

export const METHOD_VALUES = {
    POSITIVE_CENTERLINE: 'positive_direction_centerline',
    APPROXIMATE_MEDIAN: 'approximate_divided_highway_median_offset'
};
