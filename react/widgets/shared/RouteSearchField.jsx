/**
 * Route alias search input with autofill/autocomplete suppressed.
 * Browsers often suggest saved values on type="search" without autocomplete=off.
 */
export function RouteSearchField({ id, placeholder, value, onChange }) {
    return (
        <input
            id={id}
            name={`${id}-route-alias-lookup`}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className="route-mp-widget__input"
        />
    );
}
