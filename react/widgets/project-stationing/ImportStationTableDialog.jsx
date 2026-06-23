import { useState } from 'react';
import { WidgetPanelShell } from '../shared/WidgetPanelShell.jsx';
import { ImportStationTablePanel } from './ImportStationTablePanel.jsx';

export function ImportStationTableDialog({
    routeProfile,
    suggestedNaming,
    onCancel,
    onFileLoad,
    onAnalyzeMapping,
    onPlot
}) {
    const [footerState, setFooterState] = useState({
        error: '',
        loading: false,
        plotting: false,
        disabled: true,
        plotRows: null,
        status: ''
    });

    return (
        <WidgetPanelShell
            className="project-stationing-import-widget"
            status={footerState.status}
            statusTone={footerState.error ? 'danger' : 'muted'}
            onCancel={onCancel}
            onRun={footerState.plotRows}
            runLabel="Plot Ready Rows"
            running={footerState.plotting}
            disabled={footerState.disabled}
        >
            <ImportStationTablePanel
                routeProfile={routeProfile}
                suggestedNaming={suggestedNaming}
                onFileLoad={onFileLoad}
                onAnalyzeMapping={onAnalyzeMapping}
                onPlot={onPlot}
                onStatusChange={setFooterState}
            />
        </WidgetPanelShell>
    );
}
