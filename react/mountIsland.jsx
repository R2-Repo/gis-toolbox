import { createRoot } from 'react-dom/client';

/**
 * Mount a React component into an existing DOM element.
 * Returns an unmount callback for caller-managed teardown paths.
 */
export function mountIsland(element, Component, props = {}) {
  if (!element) {
    throw new Error('mountIsland: target element is required');
  }

  const root = createRoot(element);
  root.render(<Component {...props} />);

  return () => root.unmount();
}
