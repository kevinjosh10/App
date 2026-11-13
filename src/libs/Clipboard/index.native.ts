import Log from '@libs/Log';
import Clipboard from '@react-native-clipboard/clipboard';

import type {CanSetHtml, SetHtml, SetString} from './types';

/**
 * Sets a string on the Clipboard object via @react-native-clipboard/clipboard
 */
const setString: SetString = (text) => {
    try {
        Clipboard.setString(text);
        return Promise.resolve(true);
    } catch (error) {
        Log.warn('Failed to copy text to clipboard on native', {error: error instanceof Error ? error.message : String(error)});
        return Promise.resolve(false);
    }
};

// We don't want to set HTML on native platforms so noop them.
const canSetHtml: CanSetHtml = () => false;
const setHtml: SetHtml = () => Promise.resolve(false);

export default {
    setString,
    canSetHtml,
    setHtml,
};
