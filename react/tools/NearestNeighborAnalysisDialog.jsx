import { WidgetPanelShell } from '../widgets/shared/WidgetPanelShell.jsx';

export function NearestNeighborAnalysisDialog({ onCancel, onRun }) {
    return (
        <WidgetPanelShell
            onCancel={onCancel}
            onRun={() => onRun?.()}
            runLabel="Run Analysis"
        />
    );
}
