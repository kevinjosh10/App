## Proposal

### What is the root cause of that problem?
In `src/libs/Request.ts:25-30`:

```ts
function makeXHR<TKey extends OnyxKey>(request: Request<TKey>): Promise<Response<TKey> | void> {
    const finalParameters = enhanceParameters(request.command, request?.data ?? {});
    return hasReadRequiredDataFromStorage().then((): Promise<Response<TKey> | void> => {
        return HttpUtils.xhr(request.command, finalParameters, request.type, request.shouldUseSecure, request.initiatedOffline);
    });
}
```

`enhanceParameters()` is executed synchronously on line 26 **before** awaiting `hasReadRequiredDataFromStorage()`.

During mobile app cold startup (or background push handling / persisted request replay), if a network request is initiated before Onyx finishes reading `SESSION` and `CREDENTIALS` from local storage:
1. `authToken` in `NetworkStore.ts` is still `undefined`.
2. `enhanceParameters` calls `getAuthToken()`, which returns `undefined`. Line 95 of `enhanceParameters.ts` falls back to `null` (`finalParameters.authToken = authToken ?? null;`) and captures `clientUpdateID: -1`.
3. Later, storage hydration completes, `NetworkStore` populates the valid session `authToken`, and `hasReadRequiredDataFromStorage()` resolves.
4. However, `HttpUtils.xhr` is invoked with the pre-captured `finalParameters` object containing `authToken: null` and `clientUpdateID: -1`.
5. The backend receives the request without an authentication token and returns a `407 Not Authenticated` response. For accounts configured with SAML, this unexpected 407 triggers reauthentication / SAML redirect, unnecessarily signing out the user despite having a valid saved session in storage.

### What changes do you think we should make in order to solve the problem?
1. In `src/libs/Request.ts`, move the call to `enhanceParameters` inside the `hasReadRequiredDataFromStorage().then(...)` callback immediately before calling `HttpUtils.xhr`:

```ts
function makeXHR<TKey extends OnyxKey>(request: Request<TKey>): Promise<Response<TKey> | void> {
    return hasReadRequiredDataFromStorage().then((): Promise<Response<TKey> | void> => {
        const finalParameters = enhanceParameters(request.command, request?.data ?? {});
        return HttpUtils.xhr(request.command, finalParameters, request.type, request.shouldUseSecure, request.initiatedOffline);
    });
}
```

This guarantees that parameter enhancement always reads the latest hydrated `authToken`, `accountID`, `clientUpdateID`, and credentials from `NetworkStore`.

2. In `tests/unit/RequestTest.ts`:
   Add a unit test simulating a request dispatched while `hasReadRequiredDataFromStorage` is pending. Verify that `enhanceParameters` (and the resulting XHR call) is evaluated with the hydrated session data once the storage promise resolves.

### What alternative solutions did you explore? (Optional)
- Mutating or re-evaluating `finalParameters.authToken` inside `.then()`: mutating properties post-enhancement is error-prone, violates clean parameter construction, and fails to update other dependent fields like `clientUpdateID` or `delegate`. Moving the entire `enhanceParameters` call inside the resolved storage callback is cleaner and guarantees all parameters are constructed atomically with fully hydrated state.

---

### Contributor Details
- **Expensify Email:** lkevinjosh10@gmail.com
- **Upwork Profile:** https://www.upwork.com/freelancers/~0131dae36abcf59374
