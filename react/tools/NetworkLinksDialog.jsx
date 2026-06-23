import { useState } from 'react';

export function NetworkLinksDialog({ hrefs = [], onDismiss, onFetch }) {
    const [isFetching, setIsFetching] = useState(false);

    const handleFetch = async () => {
        if (isFetching) return;
        setIsFetching(true);
        try {
            await onFetch?.();
        } finally {
            setIsFetching(false);
        }
    };

    return (
        <div>
            <p>This KML references external content via <strong>NetworkLink</strong>. In the browser, only URLs that allow cross-origin access can be loaded automatically; many public servers block this.</p>
            <ul style={{ maxHeight: '180px', overflow: 'auto', margin: '8px 0', paddingLeft: '18px' }}>
                {hrefs.map((href, index) => (
                    <li key={`${href}-${index}`} style={{ wordBreak: 'break-all', fontSize: '11px' }}>{href}</li>
                ))}
            </ul>
            <p className="text-xs text-muted">Only <code>http:</code> / <code>https:</code> links are fetched here. Paths inside a KMZ are not resolved from this dialog.</p>
            <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => onDismiss?.()} disabled={isFetching}>Not now</button>
                <button type="button" className="btn btn-primary" onClick={handleFetch} disabled={isFetching}>
                    {isFetching ? 'Fetching...' : 'Fetch HTTP(S) links'}
                </button>
            </div>
        </div>
    );
}
