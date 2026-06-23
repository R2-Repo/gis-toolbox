import React from 'react';
import {
    HintText,
    InspectorInput,
    InspectorLabel,
    InspectorSelect
} from './shared.jsx';

export function AddElevationInspector({ config, onConfigChange }) {
    return (
        <>
            <InspectorLabel>Elevation Field Name</InspectorLabel>
            <InspectorInput
                value={config.fieldName ?? 'elevation'}
                placeholder="elevation"
                onChange={(value) => onConfigChange({
                    fieldName: value.trim() || 'elevation'
                })}
            />
            <InspectorLabel style={{ marginTop: 8 }}>Units</InspectorLabel>
            <InspectorSelect
                value={config.units ?? 'meters'}
                onChange={(value) => onConfigChange({ units: value })}
            >
                <option value="meters">Meters</option>
                <option value="feet">Feet</option>
            </InspectorSelect>
            <HintText>
                Queries the Open-Elevation API to add elevation values to each feature.
                Uses the centroid for lines and polygons.
            </HintText>
        </>
    );
}

export const INSPECTORS = {
    'add-elevation': AddElevationInspector
};
