import { mountIsland } from '../mountIsland.jsx';
import { WirelessSitePlanningDialog } from './WirelessSitePlanningDialog.jsx';

export function mountWirelessSitePlanningDialog(element, props = {}) {
    const unmount = mountIsland(element, WirelessSitePlanningDialog, props);
    return { unmount };
}
