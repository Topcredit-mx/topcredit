---
name: ""
overview: ""
todos: []
isProject: false
---

# Application document review — agents

**Goal:** E2E: (1) shows approved state when agent clicks Aprobar on pending document. (2) shows validation error when agent submits Rechazar without reason; shows rejected state and reason when agent submits Rechazar with reason.

**Existing:** Schema has `status` (pending | approved | rejected) and `rejectionReason`; agent app page shows documents read-only with no actions.

**Additional info:** Auth: reuse `update` on Application; only agents who can update the application may change document status. No new CASL subject/action.

---

- ## Plan 1 — Agent can approve a document

**E2E:** shows approved state when agent clicks Aprobar on pending document.

**Backend:** Add schema payload `{ documentId, status: 'approved' }` and mutation `updateApplicationDocumentStatus` (load document + application/termOffering for companyId, requireAbility(ability, 'update', subject('Application', …)), set status approved and rejectionReason null, revalidate app + dashboard paths).

**UI:** On agent application detail, for each document with status pending show "Aprobar" button; on click call server action and refresh list. Add i18n for "Aprobar" and any toasts.

**Deliverable:** One PR. When done, run code-review (subagent).

---

- ## Plan 2 — Agent can reject a document with reason

**E2E:** (1) shows validation error when agent submits Rechazar without reason. (2) shows rejected state and reason when agent submits Rechazar with reason.

**Backend:** Extend payload with `status: 'approved' | 'rejected'` and optional `rejectionReason`; Zod refinement: rejectionReason required when status is rejected. Extend mutation to handle rejected case (set status + rejectionReason; approved clears reason).

**UI:** Add "Rechazar" next to Aprobar; click opens modal with required "Motivo de rechazo"; submit calls action with documentId, status, rejectionReason; show validation in modal; on success refresh so document shows rejected and reason. i18n for Rechazar, Motivo de rechazo, validation messages.

**Deliverable:** One PR. Depends on Plan 1. When done, run code-review (subagent).