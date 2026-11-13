import {getPreservedNavigatorState} from '@libs/Navigation/AppNavigator/createSplitNavigator/usePreserveNavigatorState';
import {getTabScreenParam} from '@libs/Navigation/helpers/tabNavigatorUtils';
import type {NavigationRoute} from '@libs/Navigation/types';

import NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';

import type {NavigationState} from '@react-navigation/native';

/**
 * Returns the active tab name for a given route.
 * If the route is TAB_NAVIGATOR, it returns the name of the focused tab inside it.
 * Otherwise, it returns the route name itself.
 */
function getActiveTabName(route: NavigationRoute | undefined): string | undefined {
    if (!route) {
        return undefined;
    }

    if (route.name === NAVIGATORS.TAB_NAVIGATOR) {
        const state = (route.state ?? (route.key ? getPreservedNavigatorState<NavigationState>(route.key) : undefined)) as NavigationState | undefined;
        if (state?.routes) {
            const index = state.index ?? 0;
            return state.routes.at(index)?.name;
        }

        const paramScreen = getTabScreenParam(route);
        if (paramScreen) {
            return paramScreen;
        }

        return SCREENS.HOME;
    }

    return route.name;
}

export default getActiveTabName;
