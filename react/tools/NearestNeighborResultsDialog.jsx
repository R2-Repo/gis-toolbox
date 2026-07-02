import { WidgetPanelShell } from '../widgets/shared/WidgetPanelShell.jsx';

export function NearestNeighborResultsDialog({ pattern, p, featureCount, onCancel }) {
    return (
        <WidgetPanelShell
            showRun={false}
            onCancel={onCancel}
        >
            <div className="gis-widget__status" style={{ textAlign: 'center', fontSize: '16px', fontWeight: 700, color: 'var(--gold-light)', marginBottom: '8px' }}>
                {pattern}
            </div>
            <table className="gis-widget__preview-table">
                <tbody>
                    <tr>
                        <td>Observed mean</td>
                        <td>{p.observedMeanDistance?.toFixed(6) || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td>Expected mean</td>
                        <td>{p.expectedMeanDistance?.toFixed(6) || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td>NN ratio</td>
                        <td>{p.nearestNeighborIndex?.toFixed(4) || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td>Z-score</td>
                        <td>{p.zscore?.toFixed(4) || 'N/A'}</td>
                    </tr>
                </tbody>
            </table>
            <p className="text-xs text-muted" style={{ marginTop: '8px' }}>
                Z &lt; -1.65 clustered; Z &gt; 1.65 dispersed. Features: {featureCount}
            </p>
        </WidgetPanelShell>
    );
}
