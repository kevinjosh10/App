## Proposal

### Please re-state the problem that we are trying to solve in this issue.
When navigating to `https://staging.new.expensify.com/insights` on Web/Desktop, the application gets stuck on an infinite loading spinner (green bootsplash) and after ~45–60 seconds, the browser triggers the system modal `"Page Unresponsive - You can wait for it to become responsive or exit the page"`.

### What is the root cause of that problem?
The root cause is a synchronous infinite re-render loop on the JavaScript main thread caused by referential instability in `useMultipleSnapshots` and unmemoized selector evaluations in `InsightsDashboard.tsx`:

1. In `src/pages/Insights/InsightsDashboard.tsx`:
   ```ts
   const visibleChartQueries = query
       ? [query.headlineChart, ...query.supportingCharts]
       : [headlineSpec, ...eligibleCharts].map((chart): InsightsChartQuery => ({chart, queryJSON: undefined}));
   const snapshots = useMultipleSnapshots(
       visibleChartQueries.flatMap(({queryJSON, previousPeriodQueryJSON}) =>
           [queryJSON, previousPeriodQueryJSON].flatMap((chartQueryJSON) => (chartQueryJSON ? [String(chartQueryJSON.hash)] : [])),
       ),
   );
   ```
   On cold load / direct navigation to `/insights` before policies and filters resolve, `visibleChartQueries` and the inline `.flatMap(...)` call generate a brand new array reference on every single render.

2. In `src/hooks/useMultipleSnapshots.ts`:
   ```ts
   function useMultipleSnapshots(hashes: string[]): SnapshotMap {
       const selector = (snapshots: OnyxCollection<SearchResults>): SnapshotMap => {
           if (!snapshots || hashes.length === 0) {
               return {};
           }

           const result: SnapshotMap = {};
           for (const hash of hashes) {
               const snapshot = snapshots[`${ONYXKEYS.COLLECTION.SNAPSHOT}${hash}`];
               if (snapshot) {
                   result[hash] = snapshot;
               }
           }
           return result;
       };

       const [snapshotMap = getEmptyObject<SnapshotMap>()] = useOnyx(ONYXKEYS.COLLECTION.SNAPSHOT, {
           selector,
       });

       return snapshotMap;
   }
   ```
   - The `selector` is an unmemoized inline closure created on every render.
   - When `hashes.length === 0` (or `snapshots` is unset), line 18 executes `return {};`, which returns a newly allocated `{}` object literal in memory on every invocation rather than a cached singleton like `getEmptyObject<SnapshotMap>()`.
   - `useOnyx` integrates with React's `useSyncExternalStoreWithSelector`. When `selector` returns `{}` on every pass, `Object.is(prev, next)` evaluates to `false` because the two empty objects have different memory addresses.
   - React treats this referential change as a store mutation and immediately schedules and executes a synchronous re-render of `InsightsDashboard`.
   - In that next render, `visibleChartQueries.flatMap(...)` produces another new array reference, `selector` executes, returns another new `{}` object reference, and triggers another re-render.
   - This cascades into an unbreakable synchronous render loop:
     `Render -> selector() returns new {} -> Object.is(prev, next) === false -> synchronous re-render -> repeat`.
   - Because `InsightsDashboard` is the active mounted screen on `/insights`, the JS thread is 100% saturated. The event loop cannot yield to process bootsplash dismissal or frame animations, and Chrome displays the **"Page Unresponsive"** dialog.

### What changes do you think we should make in order to solve the problem?

1. **Stabilize `useMultipleSnapshots` (`src/hooks/useMultipleSnapshots.ts`):**
   - Return `getEmptyObject<SnapshotMap>()` when `!snapshots || hashes.length === 0` to preserve strict referential equality (`Object.is`) across selector calls.
   - Store the previous result in `useRef` and perform shallow reference equality on the resolved snapshots before returning a new object reference. If the underlying snapshots haven't changed, return `prevResultRef.current`.
   - Wrap `selector` in `useCallback` with `hashes.join(',')` to keep the selector function reference stable across renders.

   ```ts
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
   ```

2. **Memoize query and hash inputs in `InsightsDashboard` (`src/pages/Insights/InsightsDashboard.tsx`):**
   - Wrap `visibleChartQueries` and `snapshotHashes` in `useMemo` so `useMultipleSnapshots` receives a stable array reference:

   ```tsx
   const visibleChartQueries = useMemo(
       () =>
           query
               ? [query.headlineChart, ...query.supportingCharts]
               : [headlineSpec, ...eligibleCharts].map((chart): InsightsChartQuery => ({chart, queryJSON: undefined})),
       [query, headlineSpec, eligibleCharts],
   );
   const snapshotHashes = useMemo(
       () =>
           visibleChartQueries.flatMap(({queryJSON, previousPeriodQueryJSON}) =>
               [queryJSON, previousPeriodQueryJSON].flatMap((chartQueryJSON) => (chartQueryJSON ? [String(chartQueryJSON.hash)] : [])),
           ),
       [visibleChartQueries],
   );
   const snapshots = useMultipleSnapshots(snapshotHashes);
   ```

### What alternative solutions did you explore? (Optional)
- Only memoizing `visibleChartQueries` without fixing `useMultipleSnapshots`: this leaves `useMultipleSnapshots` vulnerable to re-render loops in any component where caller arrays are reconstructed dynamically or when `hashes.length === 0`. Returning `getEmptyObject<SnapshotMap>()` and memoizing selector results within the hook ensures full resilience across all consumers.
