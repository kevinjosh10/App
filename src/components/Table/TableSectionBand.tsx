import TextWithTooltip from '@components/TextWithTooltip';

import useLayoutSpacing from '@hooks/useLayoutSpacing';
import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import React from 'react';
import {View} from 'react-native';

import {useTableContext} from './TableContext';

type TableSectionBandProps = {
    /** The title/label of the section */
    title: string;

    /** The index of the row relative to all other rows in the table */
    rowIndex: number;
};

function TableSectionBand({title, rowIndex}: TableSectionBandProps) {
    const theme = useTheme();
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const {pageGutterMargin} = useLayoutSpacing();
    const {shouldUseNarrowTableLayout, rowWidth} = useTableContext();

    return (
        <View
            style={[
                pageGutterMargin,
                !!rowWidth && StyleUtils.getWidthStyle(rowWidth),
                styles.pv2,
                shouldUseNarrowTableLayout ? styles.ph4 : styles.ph3,
                StyleUtils.getBackgroundColorStyle(theme.hoverComponentBG),
                rowIndex === 0 ? styles.borderBottom : styles.borderTop,
            ]}
        >
            <TextWithTooltip
                text={title}
                style={[styles.textMicroBoldSupporting, styles.lh14]}
            />
        </View>
    );
}

TableSectionBand.displayName = 'TableSectionBand';

export default TableSectionBand;
export type {TableSectionBandProps};
