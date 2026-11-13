## Proposal

### What is the root cause of that problem?
In `src/pages/Search/SearchEditMultiple/SearchEditMultiplePage.tsx`, bulk editing determines whether the Reimbursable field should be shown for the selected transactions on line 163:

```ts
return !isIOUReport(report) && !isInvoiceReport(report) && transactionPolicy?.disabledFields?.reimbursable === false && !isManagedCardTransaction(transaction);
```

There are two distinct bugs with the strict `transactionPolicy?.disabledFields?.reimbursable === false` check:
1. **Omitted / Undefined Lock Flag:** By default in Expensify workspaces, `disabledFields.reimbursable` is `undefined` when the lock hasn't been explicitly configured (it is not explicitly set to `false`). In JavaScript, `undefined === false` evaluates to `false`. Therefore, for all standard unlocked workspaces, bulk edit erroneously treats Reimbursable as not editable and hides the field.
2. **Disagreement with Locked Policy Default:** For individual expense editing, `MoneyRequestView.tsx` uses `canShowReimbursableToggleForPolicy(policy, isReimbursable)` from `src/libs/PolicyUtils/policy.ts`:
   ```ts
   function canShowReimbursableToggleForPolicy(policy: OnyxEntry<Policy>, isReimbursable: boolean | undefined): boolean {
       if (!policy?.disabledFields?.reimbursable) {
           return true;
       }
       return (isReimbursable ?? true) !== (policy.defaultReimbursable ?? true);
   }
   ```
   Even when `disabledFields.reimbursable` is locked (`true`), an expense that currently disagrees with the policy default (`(isReimbursable ?? true) !== (policy.defaultReimbursable ?? true)`) must remain correctable so it isn't permanently stuck on an unintended value. Line 163 in `SearchEditMultiplePage` ignored `canShowReimbursableToggleForPolicy`, causing a discrepancy where individual editing allows correcting reimbursable status, but bulk edit completely hides the field.

### What changes do you think we should make in order to solve the problem?
In `src/pages/Search/SearchEditMultiple/SearchEditMultiplePage.tsx`:
1. Import `canShowReimbursableToggleForPolicy` from `@libs/PolicyUtils`.
2. Replace `transactionPolicy?.disabledFields?.reimbursable === false` with `canShowReimbursableToggleForPolicy(transactionPolicy, transaction.reimbursable)`:

   ```ts
   const areSelectedTransactionsReimbursable = selectedTransactionContexts.every(({transaction, report, transactionPolicy}) => {
       // Unreported expenses have no policy yet but reimbursable is always applicable
       if (!transaction.reportID || transaction.reportID === CONST.REPORT.UNREPORTED_REPORT_ID) {
           return true;
       }
       return !isIOUReport(report) && !isInvoiceReport(report) && canShowReimbursableToggleForPolicy(transactionPolicy, transaction.reimbursable) && !isManagedCardTransaction(transaction);
   });
   ```

This aligns bulk edit visibility with individual edit visibility across all workspace configurations:
- Workspaces with `disabledFields.reimbursable === undefined` or `false` allow bulk editing.
- Workspaces with locked reimbursable permit bulk editing when the selected expenses disagree with the locked policy default.
- Existing checks for IOU reports, invoice reports, managed card transactions, and partial editability (`hasPartiallyEditableReimbursableTransaction`) remain fully intact.

### What alternative solutions did you explore? (Optional)
- Using `transactionPolicy?.disabledFields?.reimbursable !== true`: while this fixes the `undefined` lock flag issue, it still fails to support correcting expenses that disagree with a locked policy default. Reusing the canonical `canShowReimbursableToggleForPolicy` helper maintains consistency with `MoneyRequestView`, `useFooterDerivedFlags`, and `DynamicSplitExpenseEditPage`.

---

### Contributor Details
- **Expensify Email:** lkevinjosh10@gmail.com
- **Upwork Profile:** https://www.upwork.com/freelancers/~0131dae36abcf59374
