import useAppFocusEvent from '@hooks/useAppFocusEvent';
import useOnyx from '@hooks/useOnyx';

import {checkIfWalletIsAvailable, isCardInWallet} from '@libs/Wallet';

import {isActingAsDelegateSelector} from '@selectors/Account';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Card} from '@src/types/onyx';

import {useEffect, useState} from 'react';

type UseIsCardInWalletType = {
    isInWallet: boolean | null;
    isLoading: boolean;
    isCardAvailable: boolean;
    isWalletAvailable: boolean;
};

function useIsCardInWallet(card: Card): UseIsCardInWalletType {
    const [isInWallet, setIsInWallet] = useState<boolean | null>(null);
    const [isWalletAvailable, setIsWalletAvailable] = useState(false);
    const [isActingAsDelegate = false] = useOnyx(ONYXKEYS.ACCOUNT, {selector: isActingAsDelegateSelector});
    const isCardAvailable = !isActingAsDelegate && card.state === CONST.EXPENSIFY_CARD.STATE.OPEN;
    const [isLoading, setIsLoading] = useState(false);
    const checkIfCardIsInWallet = () => {
        isCardInWallet(card)
            .then((result) => {
                setIsInWallet(result);
            })
            .catch(() => {
                setIsInWallet(false);
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    useEffect(() => {
        if (!isCardAvailable) {
            return;
        }

        checkIfCardIsInWallet();
    }, [checkIfCardIsInWallet, isCardAvailable, card]);

    useEffect(() => {
        if (!isCardAvailable) {
            return;
        }

        checkIfWalletIsAvailable()
            .then((result) => {
                setIsWalletAvailable(result);
            })
            .catch(() => {
                setIsWalletAvailable(false);
            });
    }, [isCardAvailable]);

    // Recheck card status when app regains focus in case user manually adds card to wallet outside the app
    useAppFocusEvent(() => {
        if (!isCardAvailable) {
            return;
        }
        checkIfCardIsInWallet();
    });

    return {
        isInWallet,
        isLoading,
        isCardAvailable,
        isWalletAvailable,
    };
}

export default useIsCardInWallet;
