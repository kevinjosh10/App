## Proposal

### What is the root cause of that problem?
The root cause is a synchronous infinite re-render loop on the JavaScript main thread triggered by referential instability in `useMultipleSnapshots` and unmemoized selector evaluations in `InsightsDashboard`:

1. In `src/pages/Insights/InsightsDashboard.tsx`:
   On cold boot or direct navigation to `/insights` before policies and filters are resolved, `visibleChartQueries` and the inline `.flatMap(...)` call generate a brand new array reference on every single render.

2. In `src/hooks/useMultipleSnapshots.ts`:
   The `selector` passed into `useOnyx` is an unmemoized inline function. When `hashes.length === 0` (or `snapshots` is unset), it executes `return {};`, which returns a newly allocated `{}` object literal in heap memory on every evaluation instead of a cached singleton like `getEmptyObject<SnapshotMap>()`.

3. In `useOnyx` (via React's `useSyncExternalStoreWithSelector`):
   React compares the returned value with `Object.is`. Because `Object.is({}, {}) === false`, React interprets the newly allocated object as a state change and immediately schedules a synchronous re-render.

4. On each re-render, `visibleChartQueries.flatMap(...)` generates another new array reference, `selector` executes again, returns another new `{}` object reference, and triggers another re-render.

5. This results in an infinite synchronous render loop on the JavaScript main thread:
   `Render -> selector() returns new {} -> Object.is(prev, next) === false -> synchronous re-render -> repeat`.
   Because `InsightsDashboard` is the active mounted screen on `/insights`, the JS thread is 100% pegged. The browser event loop cannot yield to dismiss the green bootsplash or process paint frames, and Chrome displays the **"Page Unresponsive"** dialog after ~45–60 seconds.

### What changes do you think we should make in order to solve the problem?

1. **Stabilize `useMultipleSnapshots` (`src/hooks/useMultipleSnapshots.ts`):**
   - When `!snapshots || hashes.length === 0`, return `getEmptyObject<SnapshotMap>()` instead of `{}`. This ensures strict referential equality (`Object.is`) across selector calls.
   - Memoize the `selector` with `useCallback` using `hashes.join(',')` as a dependency key so the selector function reference remains stable across renders.
   - Use `useRef` to store the previous result (`prevResultRef`) and perform shallow reference equality on the resolved snapshots before returning. If the underlying snapshots have not changed, return `prevResultRef.current` to prevent emitting new object references.

2. **Memoize query and hash inputs in `InsightsDashboard` (`src/pages/Insights/InsightsDashboard.tsx`):**
   - Wrap `visibleChartQueries` and `snapshotHashes` in `useMemo` so `useMultipleSnapshots` receives a stable array reference across renders:
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
- Only memoizing `visibleChartQueries` in `InsightsDashboard` without fixing `useMultipleSnapshots`: this leaves `useMultipleSnapshots` vulnerable to re-render loops in any other component where caller arrays are reconstructed dynamically or when `hashes.length === 0`. Returning `getEmptyObject<SnapshotMap>()` and memoizing selector results within the hook ensures full resilience across all consumers.

---

### Contributor Details
- **Expensify Email:** lkevinjosh10@gmail.com
- **Upwork Profile:** https://www.upwork.com/freelancers/~0131dae36abcf59374
