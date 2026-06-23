export function RouteSearchResults({
    searchResults,
    dividedGroup,
    searching,
    searchText,
    onPickGroup,
    onPickVariant,
    onBackFromDivided
}) {
    if (dividedGroup) {
        return (
            <div className="route-search-results">
                <button
                    type="button"
                    className="route-search-result route-search-result--back"
                    onClick={onBackFromDivided}
                >
                    ← Back
                </button>
                <div className="text-xs text-muted p-4">
                    Choose direction for {dividedGroup.routeAlias}
                </div>
                {dividedGroup.variants.map((variant) => (
                    <button
                        key={variant.routeId}
                        type="button"
                        className="route-search-result"
                        onClick={() => onPickVariant(variant)}
                    >
                        {variant.routeLabel}
                    </button>
                ))}
            </div>
        );
    }

    return (
        <div className="route-search-results">
            {searchResults.map((group) => (
                <button
                    key={group.groupKey}
                    type="button"
                    className="route-search-result"
                    onClick={() => onPickGroup(group)}
                >
                    {group.routeLabel}
                </button>
            ))}
            {!searching && searchText.trim().length >= 2 && searchResults.length === 0 ? (
                <div className="text-xs text-muted p-4">No routes matched.</div>
            ) : null}
        </div>
    );
}
