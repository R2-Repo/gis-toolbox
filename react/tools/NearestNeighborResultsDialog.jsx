export function NearestNeighborResultsDialog({ pattern, p, featureCount }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ textAlign: 'center', fontSize: '20px', fontWeight: 700, color: 'var(--gold-light)', marginBottom: '4px' }}>
                {pattern}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div style={{ padding: '8px', background: 'var(--bg-surface)', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Observed Mean Distance</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>{p.observedMeanDistance?.toFixed(6) || 'N/A'}</div>
                </div>
                <div style={{ padding: '8px', background: 'var(--bg-surface)', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Expected Mean Distance</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>{p.expectedMeanDistance?.toFixed(6) || 'N/A'}</div>
                </div>
                <div style={{ padding: '8px', background: 'var(--bg-surface)', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Nearest Neighbor Ratio</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>{p.nearestNeighborIndex?.toFixed(4) || 'N/A'}</div>
                </div>
                <div style={{ padding: '8px', background: 'var(--bg-surface)', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Z-Score</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>{p.zscore?.toFixed(4) || 'N/A'}</div>
                </div>
            </div>
            <div className="info-box text-xs" style={{ marginTop: '4px' }}>
                <strong>Interpretation:</strong> Z-score &lt; -1.65 → Clustered. Z-score &gt; 1.65 → Dispersed. Between → Random.
                A ratio &lt; 1 suggests clustering, &gt; 1 suggests dispersion.
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Features analyzed: {featureCount}
            </div>
        </div>
    );
}
