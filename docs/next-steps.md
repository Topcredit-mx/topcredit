# App flow proposal — gap analysis

Based on [app-flow-proposal.md](./app-flow-proposal.md): these are the suggested next steps.

---

## Next steps

1. **Implement the authorization stage explicitly**
   - Decide whether `authorized` remains an admin-only action temporarily or gets its own dedicated `authorizations` role now.
   - If a dedicated role is introduced, add DB role support, permissions, filtered queue, and detail actions for reviewing `pre-authorized` applications.
   - Define exactly which additional applicant uploads, if any, are required before authorization review after the initial submission step.

2. **Design the post-authorization operational flow**
   - Add the HR concepts needed after authorization, such as `hrStatus` and `firstDiscountDate`.
   - Define when an application becomes a `Credit` and which data belongs on the application vs. the eventual credit/disbursement model.
   - Build the disbursement workflow: eligible queue, transfer data capture, receipt upload, and credit creation.

3. **Build credits and payments**
   - Create the credits model and payment schedule model.
   - Add applicant-facing credit and payment-history views.
   - Add HR/payment operations for confirming payroll deductions and reporting on collections or completed credits.

4. **Keep docs and tests aligned with the chosen workflow**
   - Tighten assertions anywhere tests still allow legacy ambiguity between `new` and `pending`.
   - Continue renaming old fixtures/copy that still imply the deprecated “company not ready” gating behavior.
   - Update operational docs whenever new roles or queues move from proposal to implementation.
