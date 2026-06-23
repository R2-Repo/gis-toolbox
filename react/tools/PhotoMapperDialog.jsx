import { useRef, useState } from 'react';

export function PhotoMapperDialog({ onCancel, onProcessFiles, onConfirm }) {
    const fileInputRef = useRef(null);
    const [result, setResult] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [photoSize, setPhotoSize] = useState('thumbnail');

    const handleFiles = async (files) => {
        if (!files || files.length === 0 || isProcessing) return;
        setIsProcessing(true);
        try {
            const processed = await onProcessFiles?.(files);
            if (processed) {
                setResult(processed);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const openPicker = () => {
        if (!fileInputRef.current || isProcessing) return;
        fileInputRef.current.value = '';
        fileInputRef.current.click();
    };

    return (
        <div>
            <div
                className={`drop-zone ${isProcessing ? 'disabled' : ''}`}
                id="photo-drop-react"
                style={{ marginBottom: '16px' }}
                onDragOver={(e) => {
                    e.preventDefault();
                    if (!isProcessing) e.currentTarget.classList.add('dragover');
                }}
                onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
                onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('dragover');
                    if (isProcessing) return;
                    handleFiles(Array.from(e.dataTransfer.files || []));
                }}
                onClick={(e) => {
                    if (isProcessing) return;
                    if (e.target === e.currentTarget || e.target.tagName === 'P' || e.target.tagName === 'DIV') {
                        openPicker();
                    }
                }}
            >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📷</div>
                <p>{isProcessing ? 'Processing photos...' : 'Drop photos here or tap to select'}</p>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.jpg,.jpeg,.png,.heic,.heif,.tiff,.tif"
                    style={{ opacity: 0, position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}
                    onChange={(e) => handleFiles(Array.from(e.target.files || []))}
                />
                <button
                    className="btn btn-primary mt-8"
                    id="photo-btn-react"
                    disabled={isProcessing}
                    onClick={(e) => {
                        e.stopPropagation();
                        openPicker();
                    }}
                >
                    {isProcessing ? 'Processing…' : 'Select Photos'}
                </button>
            </div>

            <div className="info-box text-xs mb-8" style={{ color: 'var(--text-muted)' }}>
                📍 Photos must contain embedded GPS/geolocation metadata (EXIF) to be placed on the map. Most smartphone cameras save location automatically when location services are enabled. Photos without GPS data will still be listed but won't appear on the map.
            </div>

            {result ? (
                <div id="photo-results-react">
                    <div id="photo-stats-react" className="flex gap-8 mb-8">
                        <span className="badge badge-success">✅ {result.withGPS} with GPS</span>
                        <span className="badge badge-warning">⚠️ {result.withoutGPS} without GPS</span>
                        <span className="badge badge-info">{result.photos.length} total</span>
                    </div>
                    <div id="photo-grid-react" className="photo-grid">
                        {result.photos.map((photo, index) => (
                            <div key={`${photo.filename}-${index}`} className={`photo-card ${photo.hasGPS ? '' : 'no-gps'}`} style={{ position: 'relative' }}>
                                {photo.thumbnailUrl ? (
                                    <img src={photo.thumbnailUrl} alt={photo.filename} />
                                ) : (
                                    <div style={{ height: '100px', background: '#eee' }} />
                                )}
                                <div className="photo-info">{photo.filename}</div>
                                {!photo.hasGPS ? (
                                    <div style={{ position: 'absolute', top: '4px', right: '4px', background: '#d97706', color: 'white', fontSize: '9px', padding: '1px 4px', borderRadius: '3px' }}>
                                        No GPS
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                    <div className="form-group mt-8">
                        <label className="checkbox-row">
                            <input
                                type="radio"
                                name="photo-size-react"
                                value="thumbnail"
                                checked={photoSize === 'thumbnail'}
                                onChange={() => setPhotoSize('thumbnail')}
                            /> Thumbnails (smaller, faster)
                        </label>
                        <label className="checkbox-row">
                            <input
                                type="radio"
                                name="photo-size-react"
                                value="full"
                                checked={photoSize === 'full'}
                                onChange={() => setPhotoSize('full')}
                            /> Full-size originals (larger file)
                        </label>
                    </div>
                    <div style={{ textAlign: 'right', marginTop: '12px' }}>
                        <button
                            className="btn btn-primary"
                            id="photo-ok-btn-react"
                            onClick={() => onConfirm?.({ useFullSize: photoSize === 'full' })}
                        >
                            OK — Add to Map
                        </button>
                    </div>
                </div>
            ) : null}

            <div className="modal-footer">
                <button className="btn btn-secondary cancel-btn" onClick={() => onCancel?.()}>Close</button>
            </div>
        </div>
    );
}
