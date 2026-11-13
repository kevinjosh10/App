## Proposal

### What is the root cause of that problem?
During bank account verification (personal bank account `LegalNameStep` and business account `EnterSignerInfo`), first and last names are validated using `isValidLegalName` in `src/libs/ValidationUtils.ts`:

```ts
function isValidLegalName(name: string): boolean {
    return CONST.REGEX.ALPHABETIC_AND_LATIN_CHARS.test(name);
}
```

In `src/CONST/index.ts`, `CONST.REGEX.ALPHABETIC_AND_LATIN_CHARS` is defined as:
```ts
ALPHABETIC_AND_LATIN_CHARS: /^[\p{Script=Latin} ]*$/u,
```
This regex only permits Latin script characters and spaces. It strictly disallows hyphens (`-`). When a user enters a hyphenated legal name (such as "Smith-Jones", "Anne-Marie", or "Jean-Luc"), `isValidLegalName` returns `false`, causing `FullNameStep.tsx` (and `EnterSignerInfo/subSteps/Name.tsx`) to set `errors[inputID] = translate('privatePersonalDetails.error.hasInvalidCharacter')` and block the user from continuing.

### What changes do you think we should make in order to solve the problem?
1. **Update regex in `src/CONST/index.ts`:**
   Update `CONST.REGEX.ALPHABETIC_AND_LATIN_CHARS` to allow hyphens between Latin words:
   ```ts
   ALPHABETIC_AND_LATIN_CHARS: /^[\p{Script=Latin}]+(?:[ -][\p{Script=Latin}]+)*$/u,
   ```
   This regex:
   - Allows valid hyphenated and multi-word Latin names (e.g. `Smith-Jones`, `Mary-Jane Watson`, `Jean-Luc`).
   - Rejects leading hyphens (`-Smith`), trailing hyphens (`Smith-`), consecutive hyphens (`Smith--Jones`), lone hyphens (`-`), and non-Latin characters (`άλφα`).

2. **In `src/libs/ValidationUtils.ts`:**
   Trim the input before regex evaluation in `isValidLegalName`:
   ```ts
   function isValidLegalName(name: string): boolean {
       return CONST.REGEX.ALPHABETIC_AND_LATIN_CHARS.test(name.trim());
   }
   ```

3. **In `tests/unit/ValidationUtilsTest.ts`:**
   Move `'a hyphenated-name'` and add `'Smith-Jones'` to the valid legal name test suite, and add invalid edge-case assertions (`'-'`, `'-Smith'`, `'Smith-'`, `'Smith--Jones'`).

### What alternative solutions did you explore? (Optional)
- Splitting by `'-'` with `name.split('-').every(...)`: using array splitting on every keystroke during form validation creates unnecessary heap allocations and can accept malformed patterns if not combined with strict boundary assertions. Updating the dedicated Unicode regex in `CONST.REGEX` is cleaner, faster, and maintains a single source of truth across all form consumers (`FullNameStep`, `EnterSignerInfo`, `NonUSD/SignerInfo`).

---

### Contributor Details
- **Expensify Email:** lkevinjosh10@gmail.com
- **Upwork Profile:** https://www.upwork.com/freelancers/~0131dae36abcf59374
