import Navigation from '@libs/Navigation/Navigation';
import {navigateToChatHistory} from '@libs/ProfileUtils';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';

jest.mock('@libs/Navigation/Navigation');

describe('ProfileUtils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('navigateToChatHistory', () => {
        it('calls Navigation.navigate with search route instead of revealRouteBeforeDismissingModal', () => {
            const accountID = 12345;
            navigateToChatHistory(accountID);

            expect(Navigation.navigate).toHaveBeenCalledTimes(1);
            expect(Navigation.navigate).toHaveBeenCalledWith(
                ROUTES.SEARCH_ROOT.getRoute({
                    query: `${CONST.SEARCH.DATA_TYPES.CHAT} from:12345`,
                    rawQuery: `${CONST.SEARCH.DATA_TYPES.CHAT} from:12345`,
                }),
            );
            expect(Navigation.revealRouteBeforeDismissingModal).not.toHaveBeenCalled();
        });
    });
});
