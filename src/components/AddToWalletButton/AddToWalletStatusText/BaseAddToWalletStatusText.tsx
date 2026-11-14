import useIsCardInWallet from '@components/AddToWalletButton/useIsCardInWallet';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {isActingAsDelegateSelector} from '@selectors/Account';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import {View} from 'react-native';

import type AddToWalletStatusTextProps from './types';

type BaseAddToWalletStatusTextProps = AddToWalletStatusTextProps & {
    platform: 'Apple' | 'Google';
};

function BaseAddToWalletStatusText({card, style, platform}: BaseAddToWalletStatusTextProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {isInWallet, isLoading: isCardLoading, isCardAvailable, isWalletAvailable} = useIsCardInWallet(card);
    const [isActingAsDelegate = false] = useOnyx(ONYXKEYS.ACCOUNT, {selector: isActingAsDelegateSelector});

    if (isActingAsDelegate || !isWalletAvailable || !isCardAvailable || isCardLoading || !isInWallet) {
        return null;
    }

    return (
        <View style={style}>
            <Text style={[styles.textLabelSupporting, styles.ph5, styles.pv5]}>{translate('cardPage.cardAddedToWallet', {platform})}</Text>
        </View>
    );
}

export default BaseAddToWalletStatusText;
