---
name: Application document review (agents)
overview: "Agents can review each application document: approve or reject. Rejection requires a reason. Uses existing Application update ability; no new CASL subject."
todos: []
isProject: false
---

# Application document review — agents

**Goal:** Agents (app/applications) can set each document’s status to **approved** or **rejected**. Rejected documents must have a **rejection reason**. Applicant view already shows status; no change there.

**Auth:** Reuse `update` on Application. Only agents who can `update` the application (same company scope) may change document status. No new CASL subject or action.

**Existing:** Schema has `status` (pending | approved | rejected) and `rejectionReason` (required when status = rejected). Agent app page shows documents read-only; no actions yet.

---

## Part C1 — Mutation and validation

**Goal:** Server action to set document status. Validation: `rejectionReason` required when status is `rejected`.

- **File:** [src/server/schemas.ts](src/server/schemas.ts)
  - Add payload schema for review: `{ documentId: number, status: 'approved' | 'rejected', rejectionReason?: string }` with Zod refinement: when status is `rejected`, `rejectionReason` must be non-empty string.
- **File:** [src/server/mutations.ts](src/server/mutations.ts)
  - New action: `updateApplicationDocumentStatus(documentId, payload)` (or form action with FormData).
  - Load document by id with application + termOffering (for companyId). If not found → error.
  - `requireAbility(ability, 'update', subject('Application', { id, applicantId, companyId }))` (document’s application). Use `getRequiredAgentUser()` or ensure only agents can call (ability check is the gate).
  - Validate payload (status + rejectionReason when rejected).
  - Update `application_documents` set `status`, `rejectionReason` (null when approved), `updatedAt`. Return success or error message.
  - Revalidate relevant paths (e.g. app application detail, dashboard application detail).

**Estimate:** ~50 lines.

---

## Part C2 — UI (agent application detail)

**Goal:** On agent application detail page, each document row has actions: Approve | Reject.

- **File:** [src/app/app/applications/[id]/page.tsx](src/app/app/applications/[id]/page.tsx) (or a small client component for the row actions)
  - For each document in the list, show current status (already there). Add controls:
    - If status is `pending`: show “Aprobar” and “Rechazar” (or use existing i18n keys for approve/reject).
    - **Approve:** button that calls the mutation with `status: 'approved'`. Optional: confirm dialog.
    - **Reject:** button that opens a small form/modal to enter rejection reason (required); submit calls mutation with `status: 'rejected'` and `rejectionReason`.
  - Use server action for the mutation; can be a client component with buttons that call the action, or a form with hidden inputs. Follow [form-creation skill](.cursor/skills/form-creation/SKILL.md) if using forms.
- **Messages:** [src/messages/es.json](src/messages/es.json) — add keys for “Aprobar”, “Rechazar”, “Motivo de rechazo”, placeholder, submit, success/error messages for document review.

**Estimate:** ~60–80 lines.

---

## Part C3 — E2E (optional)

**Goal:** Smoke test that an agent can approve and reject a document.

- **File:** [src/app/app/applications/application-documents.cy.ts](src/app/app/applications/application-documents.cy.ts) (or extend existing describe)
  - Seed an application with one document (pending). Login as agent, visit application detail.
  - Test: click Approve → document status shows as approved (or list updates).
  - Test: seed another document (pending), click Reject, fill rejection reason, submit → document shows rejected and reason (or list updates).

**Estimate:** ~30–40 lines.

---

## Summary


| Part   | Status | Deliverable                                                            |
| ------ | ------ | ---------------------------------------------------------------------- |
| **C1** | Todo   | Schema for review payload + `updateApplicationDocumentStatus` mutation |
| **C2** | Todo   | Agent UI: Approve / Reject (with reason) per document                  |
| **C3** | Todo   | E2E: agent approves and rejects a document                             |


**Depends on:** Application documents 3.1.2 (schema, list, upload, agent read-only list) — done.