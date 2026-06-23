import { distanceFeetToMilepost, formatMilepost } from '../../route-milepost-segment/engine.js';

export function formatLocatorRouteName(routeName) {
    return String(routeName ?? '').trim().replace(/\s+/g, '-');
}

export const TRAVEL_DIRECTION_CHOICES = ['NB', 'EB', 'SB', 'WB'];

const OPPOSITE_TRAVEL_DIRECTION = {
    EB: 'WB',
    WB: 'EB',
    NB: 'SB',
    SB: 'NB'
};

export function oppositeTravelDirection(dir) {
    return OPPOSITE_TRAVEL_DIRECTION[String(dir || '').toUpperCase()] || '';
}

export function bearingToTravelDirectionAbbrev(bearing) {
    const norm = ((Number(bearing) % 360) + 360) % 360;
    if (norm >= 315 || norm < 45) return 'NB';
    if (norm >= 45 && norm < 135) return 'EB';
    if (norm >= 135 && norm < 225) return 'SB';
    return 'WB';
}

export function travelDirectionAxisFromBearing(bearing) {
    if (bearing == null || !Number.isFinite(bearing)) return 'ew';
    const norm = ((Number(bearing) % 360) + 360) % 360;
    const eastWest = Math.min(Math.abs(norm - 90), Math.abs(norm - 270));
    const northSouth = Math.min(Math.abs(norm), Math.abs(norm - 180), Math.abs(norm - 360));
    return eastWest <= northSouth ? 'ew' : 'ns';
}

export function travelDirectionChoicesForAxis(axis) {
    return axis === 'ns' ? ['NB', 'SB'] : ['EB', 'WB'];
}

export function travelDirectionAxisLabel(axis) {
    return axis === 'ns' ? 'NB / SB' : 'EB / WB';
}

function averageBearings(bearings = []) {
    const values = bearings.filter((b) => Number.isFinite(b));
    if (!values.length) return null;
    let x = 0;
    let y = 0;
    for (const bearing of values) {
        const rad = (bearing * Math.PI) / 180;
        x += Math.sin(rad);
        y += Math.cos(rad);
    }
    return ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
}

export function milepostIncreasingBearing(line, beginMp, endMp) {
    if (typeof turf === 'undefined' || !line?.geometry) return null;
    const total = turf.length(line, { units: 'feet' });
    if (!Number.isFinite(total) || total <= 0) return null;

    const sampleFeet = Math.max(10, Math.min(50, total / 8));
    const samplePoints = [0.08, 0.25, 0.42, 0.58, 0.75, 0.92];
    const bearings = samplePoints.map((fraction) => {
        const d = fraction * total;
        const back = Math.max(0, d - sampleFeet);
        const fwd = Math.min(total, d + sampleFeet);
        const p0 = turf.along(line, back, { units: 'feet' });
        const p1 = turf.along(line, fwd, { units: 'feet' });
        return turf.bearing(p0, p1);
    });

    let bearing = averageBearings(bearings);
    if (bearing == null) {
        const pStart = turf.along(line, 0, { units: 'feet' });
        const pEnd = turf.along(line, total, { units: 'feet' });
        bearing = turf.bearing(pStart, pEnd);
    }

    const beg = Number(beginMp);
    const end = Number(endMp);
    if (Number.isFinite(beg) && Number.isFinite(end) && end < beg) {
        bearing = (bearing + 180) % 360;
    }
    return bearing;
}

export function suggestTravelDirection(line, routeProfile = {}) {
    const beginMp = routeProfile.begin_milepost;
    const endMp = routeProfile.end_milepost;
    let bearing = null;
    if (beginMp != null && endMp != null) {
        bearing = milepostIncreasingBearing(line, beginMp, endMp);
    } else {
        bearing = milepostIncreasingBearing(line, 0, 1);
    }
    const axis = travelDirectionAxisFromBearing(bearing);
    const suggested = bearing != null
        ? bearingToTravelDirectionAbbrev(bearing)
        : (routeProfile.travel_direction || '');
    return {
        axis,
        suggested,
        choices: travelDirectionChoicesForAxis(axis),
        bearing
    };
}

export function suggestSideDirectionMapping(line, routeProfile = {}) {
    const travel = suggestTravelDirection(line, routeProfile);
    const primary = travel.suggested || travel.choices?.[0] || '';
    const opposite = oppositeTravelDirection(primary) || travel.choices?.[1] || '';
    return {
        ...travel,
        rtDirection: primary,
        ltDirection: opposite,
        clDirection: primary
    };
}

export function resolveSideDirectionMapping(naming = {}, suggestion = {}) {
    const choices = suggestion.choices || travelDirectionChoicesForAxis(suggestion.axis || 'ew');
    const defaultRt = suggestion.rtDirection || suggestion.suggested || choices[0] || '';
    const defaultLt = suggestion.ltDirection || oppositeTravelDirection(defaultRt) || choices[1] || '';
    const rtDirection = String(naming.rtDirection || defaultRt).toUpperCase();
    const ltDirection = String(naming.ltDirection || defaultLt).toUpperCase();
    const clDirection = String(naming.clDirection || naming.rtDirection || defaultRt).toUpperCase();
    return {
        axis: suggestion.axis || travelDirectionAxisFromBearing(null),
        choices,
        rtDirection,
        ltDirection,
        clDirection
    };
}

export function resolveTravelDirectionForOffsetSide(offsetSide, sideMapping = {}) {
    const side = String(offsetSide || 'CL').toUpperCase();
    if (side === 'LT') return sideMapping.ltDirection || '';
    if (side === 'RT') return sideMapping.rtDirection || '';
    return sideMapping.clDirection || sideMapping.rtDirection || '';
}

export function applyLocatorNamingOptions(routeProfile = {}, naming = {}) {
    const next = { ...routeProfile };
    if (naming.routeName != null && String(naming.routeName).trim()) {
        next.route_name = String(naming.routeName).trim();
    }
    return next;
}

export function resolveTravelDirectionAbbrev(line, routeProfile = {}) {
    if (routeProfile.travel_direction) {
        return routeProfile.travel_direction;
    }

    const beginMp = routeProfile.begin_milepost;
    const endMp = routeProfile.end_milepost;
    let bearing = null;
    if (beginMp != null && endMp != null) {
        bearing = milepostIncreasingBearing(line, beginMp, endMp);
    } else {
        bearing = milepostIncreasingBearing(line, 0, 1);
    }
    if (bearing == null) return '';
    return bearingToTravelDirectionAbbrev(bearing);
}

export function enrichRouteProfileTravelDirection(line, profile = {}, options = {}) {
    const next = { ...profile };
    if (options.forceRecompute || !next.travel_direction) {
        next.travel_direction = resolveTravelDirectionAbbrev(line, {
            ...next,
            travel_direction: ''
        });
    }
    return next;
}

export function milepostAtRouteDistance(routeDistanceFt, routeProfile = {}) {
    const beg = routeProfile.begin_milepost;
    const end = routeProfile.end_milepost;
    const len = Number(routeProfile.total_length_ft ?? 0);
    if (beg == null || end == null || !Number.isFinite(len) || len <= 0) {
        return { milepost: null, milepostLabel: '' };
    }
    const mp = distanceFeetToMilepost(routeDistanceFt, beg, end, len);
    if (!Number.isFinite(mp)) {
        return { milepost: null, milepostLabel: '' };
    }
    return {
        milepost: mp,
        milepostLabel: formatMilepost(mp)
    };
}

export function buildLocatorName({
    routeName,
    milepost,
    travelDirectionAbbrev,
    stationLabel
}) {
    const route = formatLocatorRouteName(routeName) || 'Route';
    const dir = travelDirectionAbbrev || '';
    if (milepost != null && Number.isFinite(Number(milepost))) {
        const mpLabel = formatMilepost(milepost);
        return dir ? `${route} ${dir} MP ${mpLabel}` : `${route} MP ${mpLabel}`;
    }
    if (stationLabel) {
        return dir ? `${route} ${dir} Sta ${stationLabel}` : `${route} Sta ${stationLabel}`;
    }
    return route;
}

export function computeStationLocatorFields({
    routeProfile = {},
    routeDistanceFt,
    stationLabel,
    offsetSide,
    sideDirectionMapping = {}
}) {
    const travelDirectionAbbrev = resolveTravelDirectionForOffsetSide(offsetSide, sideDirectionMapping);
    const { milepost, milepostLabel } = milepostAtRouteDistance(routeDistanceFt, routeProfile);
    const locator_name = buildLocatorName({
        routeName: routeProfile.route_name,
        milepost,
        travelDirectionAbbrev,
        stationLabel
    });
    return {
        locator_name,
        locator_milepost: milepost,
        locator_milepost_label: milepostLabel,
        travel_direction: travelDirectionAbbrev
    };
}
