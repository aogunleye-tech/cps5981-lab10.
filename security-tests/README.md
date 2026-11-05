# security-tests/

Each test asserts a **security property** taken from your Unit 3 SRS or one of
your Unit 5 invariants. Every test file starts with the four-line header used in
`example-authentication.test.js`:

```
// Requirement : <ID and text from your SRS / invariant list>
// Property    : <what must always hold, stated as input => outcome>
// Proves      : <what a pass shows, and only that>
// Does NOT prove: <the honest limit of the test>
```

Minimum for the lab: the worked example plus **three tests you write**:

1. an **authorization** invariant (a logged-in student can read only their own ledger),
2. an **input-robustness** invariant (the registration parser never throws, whatever it is given),
3. one more invariant of your own choosing from your SRS.

Run them in the pipeline (they run automatically on every push and pull request).
Name each file `<something>.test.js` so the pipeline picks it up.
