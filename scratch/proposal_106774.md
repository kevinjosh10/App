## Proposal

### What is the root cause of that problem?
The behavior observed in this regression test stems directly from the architectural update introduced in PR #103072 (*"Keep duplicated expenses on the source report when it can accept them"*).

1. **Historical Context (Prior to PR #103072):**
   Duplicating any expense unconditionally targeted the user's default workspace chat (`defaultExpensePolicy`). When duplicating a Per Diem expense created on a non-default workspace, the duplicate was forced across workspaces into the default workspace. Because Per Diem rates are configured individually per-workspace, NewDot prevented this cross-workspace rate mismatch by displaying the error modal:
   `iou.duplicateNonDefaultWorkspacePerDiemError` (*"You can't duplicate per diem expenses across workspaces because the rates may differ between workspaces."*).
   The guard in `MoneyRequestHeaderSecondaryActions.tsx` was:
   ```ts
   const isPerDiemRequestOnNonDefaultWorkspace = isPerDiemRequest(transaction) && defaultExpensePolicy?.id !== policy?.id;
   ```

2. **Current Implementation (PR #103072):**
   PR #103072 introduced `canDuplicateExpenseIntoSourceReport`, allowing duplicated expenses to remain directly on their source expense report whenever that report is open and can accept new transactions.
   When duplicating an expense on an open report in a non-default workspace:
   - `canDuplicateIntoSourceReport` evaluates to `true`.
   - `duplicateTargetPolicy` resolves to `iouPolicy` (the source workspace).
   - In `MoneyRequestHeaderSecondaryActions.tsx:254` and `useExpenseActions.ts:246`, the check was intentionally updated to:
     ```ts
     const isPerDiemRequestOnNonDefaultWorkspace = isPerDiemRequest(transaction) && duplicateTargetPolicy?.id !== policy?.id;
     ```
   - Because `duplicateTargetPolicy?.id === policy?.id`, the duplicate is placed onto the **same** report in the **same** workspace. The expense does not cross workspaces, so the workspace Per Diem rates are identical.
   - Consequently, `isPerDiemRequestOnNonDefaultWorkspace` evaluates to `false`, allowing the expense to duplicate onto the same report without showing the cross-workspace error modal.
   - The error modal *only* shows when `canDuplicateIntoSourceReport` is `false` (e.g. when the non-default workspace report is submitted, approved, settled, or closed), which forces `duplicateTargetPolicy` to fall back to `defaultExpensePolicy` and cross workspaces.

Regression test case `Expensify/Expensify#604636` was written prior to PR #103072 when all duplications crossed into the default workspace.

### What changes do you think we should make in order to solve the problem?

Depending on product's preferred requirement:

- **Path A (Recommended - Working as intended per PR #103072; update the QA regression test):**
  If product agrees that duplicating a Per Diem expense on the **same open report** within the same workspace is desirable (since rates match and no cross-workspace transfer occurs):
  - No code changes are required in `MoneyRequestHeaderSecondaryActions.tsx` or `useExpenseActions.ts`.
  - Update QA test case `Expensify/Expensify#604636`:
    - Steps 6–7: Duplicating a Per Diem expense on an **open** non-default workspace report is expected to succeed on the same report.
    - Add Step 8: Duplicating a Per Diem expense on a **submitted/approved/closed** non-default workspace report (where the target falls back to `defaultExpensePolicy`) is expected to display the `iou.duplicateNonDefaultWorkspacePerDiemError` modal.

- **Path B (If product prefers strictly disallowing Per Diem duplication on all non-default workspaces regardless of report state):**
  1. In `src/components/MoneyRequestHeaderSecondaryActions.tsx:254`:
     ```ts
     const isPerDiemRequestOnNonDefaultWorkspace = isPerDiemRequest(transaction) && defaultExpensePolicy?.id !== (iouPolicy?.id ?? policy?.id);
     ```
  2. In `src/hooks/useExpenseActions.ts:246`:
     ```ts
     const isPerDiemRequestOnNonDefaultWorkspace = isPerDiemRequest(transaction) && defaultExpensePolicy?.id !== policy?.id;
     ```
  3. In `tests/ui/components/MoneyRequestHeaderSecondaryActionsTest.tsx` and `tests/actions/IOUTest/DuplicateTest.ts`:
     Add unit tests asserting that attempting to duplicate a Per Diem expense on a non-default workspace triggers `isPerDiemRequestOnNonDefaultWorkspace` and opens the confirmation modal with `iou.duplicateNonDefaultWorkspacePerDiemError`.

### What alternative solutions did you explore? (Optional)
- Checking only `defaultExpensePolicy?.id !== policy?.id` in `MoneyRequestHeaderSecondaryActions.tsx`: Rejected because on transaction thread child reports, `report.policyID` can sometimes be undefined while `iouPolicy` (from the parent expense report) is reliably populated. Using `iouPolicy?.id ?? policy?.id` ensures robust workspace resolution.
