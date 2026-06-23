import React from 'react';
import {
    HintText,
    InspectorInput,
    InspectorLabel
} from './shared.jsx';

export function PreviewInspector({ config, onConfigChange }) {
    return (
        <>
            <InspectorLabel>Max Preview Rows</InspectorLabel>
            <InspectorInput
                type="number"
                value={config.maxRows ?? 500}
                min={10}
                max={10000}
                step={10}
                onChange={(value) => onConfigChange({
                    maxRows: parseInt(value, 10) || 500
                })}
            />
            <HintText>Data appears in the bottom preview panel after running.</HintText>
        </>
    );
}

export function AddToMapInspector({ config, onConfigChange }) {
    return (
        <>
            <InspectorLabel>Layer Name</InspectorLabel>
            <InspectorInput
                value={config.layerName ?? ''}
                placeholder="Auto-generated if blank"
                onChange={(value) => onConfigChange({ layerName: value })}
            />
            <HintText>Updates the existing layer on re-run, or creates a new one.</HintText>
        </>
    );
}

export const INSPECTORS = {
    preview: PreviewInspector,
    'add-to-map': AddToMapInspector
};
