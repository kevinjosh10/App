import {useCallback, useRef} from 'react';
import type {OnyxCollection} from 'react-native-onyx';
import ONYXKEYS from '@src/ONYXKEYS';
import type {SearchResults} from '@src/types/onyx';
import {getEmptyObject} from '@src/types/utils/EmptyObject';
import useOnyx from './useOnyx';

type SnapshotMap = Record<string, SearchResults>;

/**
 * Hook to subscribe to multiple search snapshots by their hashes.
 * Returns an object mapping each hash to its corresponding SearchResults.
 */
function useMultipleSnapshots(hashes: string[]): SnapshotMap {
    const prevResultRef = useRef<SnapshotMap>(getEmptyObject<SnapshotMap>());
    const hashesKey = hashes.join(',');

    const selector = useCallback(
        (snapshots: OnyxCollection<SearchResults>): SnapshotMap => {
            if (!snapshots || hashes.length === 0) {
                return getEmptyObject<SnapshotMap>();
            }

            const result: SnapshotMap = {};
            let hasChanged = false;
            const prevResult = prevResultRef.current;

            for (const hash of hashes) {
                const snapshot = snapshots[`${ONYXKEYS.COLLECTION.SNAPSHOT}${hash}`];
                if (snapshot) {
                    result[hash] = snapshot;
                }
                if (result[hash] !== prevResult[hash]) {
                    hasChanged = true;
                }
            }

            if (!hasChanged && Object.keys(result).length === Object.keys(prevResult).length) {
                return prevResult;
            }

            prevResultRef.current = result;
            return result;
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [hashesKey],
    );

    const [snapshotMap = getEmptyObject<SnapshotMap>()] = useOnyx(ONYXKEYS.COLLECTION.SNAPSHOT, {
        selector,
    });

    return snapshotMap;
}

export default useMultipleSnapshots;
