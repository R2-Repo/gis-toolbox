import { WidgetPanelShell } from '../widgets/shared/WidgetPanelShell.jsx';

export function LineSliceDialog({ onCancel, onPick }) {
    return (
        <WidgetPanelShell
            onCancel={onCancel}
            onRun={() => onPick?.()}
            runLabel="Pick Points on Map"
        />
    );
}
