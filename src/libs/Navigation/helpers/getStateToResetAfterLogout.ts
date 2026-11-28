import NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';

import type {NavigationState, PartialState} from '@react-navigation/native';

/**
 * Pure decision logic for the NavigationRoot post-logout reset (kept out of the effect so it
 * stays unit-testable). Returns the state to pass to `navigationRef.reset`, or
 * `undefined` when there is nothing to reset.
 */
function getStateToResetAfterLogout(rootState: NavigationState | undefined): NavigationState | PartialState<NavigationState> | undefined {
    const lastRoute = rootState?.routes.at(-1);
    if (!rootState || !lastRoute) {
        return undefined;
    }

    // ValidateLogin's /v/ code is spent by logout; keeping it strands the user. Reset to
    // TAB_NAVIGATOR — this runs only post-logout (NavigationRoot gates on !authenticated), when
    // PublicScreens is mounted and TAB_NAVIGATOR (SignInPage) is its top-level route.
    // Similarly, TestToolsModalNavigator is mounted over the authenticated app; when a forced
    // sign-out occurs (e.g. SAML re-auth on invalid token), reset to TAB_NAVIGATOR so SignInPage
    // mounts and initiates the SAML sign-on transition instead of leaving the user on the modal.
    if (lastRoute.name === SCREENS.VALIDATE_LOGIN || lastRoute.name === NAVIGATORS.TEST_TOOLS_MODAL_NAVIGATOR) {
        return {index: 0, routes: [{name: NAVIGATORS.TAB_NAVIGATOR}]};
    }

    // TAB_NAVIGATOR hosts the public SignInPage at its root, reusing the authenticated tab navigator's route name.
    // The carried-over tab subtree lives in both `state` and `params.state` (getRehydratedTabNavigatorStateAfterPush
    // writes it under params), so both are cleared to reset the public route to a clean "/".
    const isTabNavigator = lastRoute.name === NAVIGATORS.TAB_NAVIGATOR;

    // ReportsSplit is shared between logged-in & logged-out; its params can carry stale auth.
    const shouldClearParams = isTabNavigator || lastRoute.name === NAVIGATORS.REPORTS_SPLIT_NAVIGATOR;
    return {
        ...rootState,
        index: 0,
        routes: [{...lastRoute, params: shouldClearParams ? undefined : lastRoute.params, state: isTabNavigator ? undefined : lastRoute.state}],
    };
}

export default getStateToResetAfterLogout;
