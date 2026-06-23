import { openSpatialAnalyzer } from './spatial-analyzer/controller.js';
import { openBulkUpdate } from './bulk-update/controller.js';
import { openProximityJoin } from './proximity-join/controller.js';
import { openRouteMilepostSegment } from './route-milepost-segment/controller.js';
import { openProjectStationing } from './project-stationing/controller.js';
import { openCrsManager } from './crs-manager/controller.js';
import logger from '../core/logger.js';

/** @typedef {import('./widget-types.js').WidgetContext} WidgetContext */

/**
 * Widgets shown in the GIS Widgets panel (`react/panels/WidgetPanel.jsx`).
 * To re-enable a hidden widget, move its entry from `GIS_WIDGETS_HIDDEN` into this array.
 */
export const GIS_WIDGETS = [
    {
        type: 'spatial-analyzer',
        action: 'openSpatialAnalyzer',
        label: 'Find Features in Area',
        icon: '🔎',
        tip: 'Search for features from one layer that fall inside a drawn area or polygon layer.',
        open: openSpatialAnalyzer
    },
    {
        type: 'bulk-update',
        action: 'openBulkUpdate',
        label: 'Bulk Update',
        icon: '✏️',
        tip: 'Select multiple features and update their attribute fields in bulk.',
        open: openBulkUpdate
    },
    {
        type: 'proximity-join',
        action: 'openProximityJoin',
        label: 'Proximity Join',
        icon: '↔️',
        tip: 'Copy attributes from the nearest feature in a target layer to each source feature.',
        open: openProximityJoin
    },
    {
        type: 'route-milepost-segment',
        action: 'openRouteMilepostSegment',
        label: 'Route Centerline',
        icon: '🛣️',
        tip: 'Build a road centerline between two UDOT mileposts.',
        open: openRouteMilepostSegment
    },
    {
        type: 'project-stationing',
        action: 'openProjectStationing',
        label: 'Project Stationing',
        icon: '📐',
        tip: 'Generate 100-ft project station segments along a UDOT route centerline.',
        open: openProjectStationing
    }
];

/**
 * Implemented but not shown in the UI. See docs/CRS_MANAGER.md.
 * @type {typeof GIS_WIDGETS}
 */
export const GIS_WIDGETS_HIDDEN = [
    {
        type: 'crs-manager',
        action: 'openCrsManager',
        label: 'CRS Manager',
        icon: '🌐',
        tip: 'Audit layer coordinate systems, batch reproject to WGS 84, register custom WKT.',
        open: openCrsManager
    }
];

/** All registered widgets (visible + hidden). */
export const ALL_GIS_WIDGETS = [...GIS_WIDGETS, ...GIS_WIDGETS_HIDDEN];

/**
 * Build APP_ACTIONS entries for visible widgets only.
 * @param {() => WidgetContext} getCtx
 * @returns {Record<string, () => void>}
 */
export function buildWidgetActions(getCtx) {
    const actions = {};
    for (const widget of GIS_WIDGETS) {
        actions[widget.action] = () => {
            logger.info('Widget', 'Open', { type: widget.type, label: widget.label });
            widget.open(getCtx());
        };
    }
    return actions;
}

/**
 * @param {string} type
 * @param {WidgetContext} ctx
 */
export function openWidget(type, ctx) {
    const widget = ALL_GIS_WIDGETS.find((entry) => entry.type === type);
    if (!widget) {
        logger.warn('Widget', 'Unknown widget type', { type });
        return;
    }
    logger.info('Widget', 'Open', { type: widget.type, label: widget.label });
    widget.open(ctx);
}
