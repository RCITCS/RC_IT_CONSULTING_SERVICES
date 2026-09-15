import { CANDIDATE_MESSAGE_TEMPLATE_OPTIONS } from "../_shared/candidate-message-templates.js";
import { esc, prettyTime } from "./ui.ts";

export const CANDIDATE_MESSAGE_SUBJECT_MAX = 300;
export const CANDIDATE_MESSAGE_BODY_MAX = 10000;
export const CANDIDATE_STATUS_NOTES_MAX = 2000;

const SAFE_DELIVERY_STATES = new Set([
  "queued",
  "sending",
  "sent",
  "delivered",
  "failed",
  "bounced",
  "complained",
  "suppressed",
  "received",
  "draft"
]);

const STATUS_TRANSITIONS: Record<string, readonly string[]> = Object.freeze({
  submitted: Object.freeze(["under_review", "rejected", "withdrawn", "archived"]),
  under_review: Object.freeze(["shortlisted", "interview", "assessment", "rejected", "withdrawn", "archived"]),
  shortlisted: Object.freeze(["under_review", "interview", "assessment", "rejected", "withdrawn", "archived"]),
  interview: Object.freeze(["under_review", "assessment", "offer", "rejected", "withdrawn", "archived"]),
  assessment: Object.freeze(["under_review", "interview", "offer", "rejected", "withdrawn", "archived"]),
  offer: Object.freeze(["hired", "rejected", "withdrawn", "archived"]),
  hired: Object.freeze(["archived"]),
  rejected: Object.freeze(["under_review", "archived"]),
  withdrawn: Object.freeze(["under_review", "archived"]),
  archived: Object.freeze(["restore"])
});

function deliveryLabel(value: unknown): string {
  const state = String(value ?? "queued").trim().toLowerCase();
  const safe = SAFE_DELIVERY_STATES.has(state) ? state : "queued";
  return safe.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusLabel(value: unknown): string {
  const state = String(value ?? "").trim().toLowerCase();
  if (state === "restore") return "Restore prior stage";
  return state.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function messageDirection(value: unknown): string {
  return String(value ?? "outbound").toLowerCase() === "inbound" ? "Inbound" : "Outbound";
}

function messageCard(message: any): string {
  const subject = String(message?.subject ?? "Candidate communication").trim() || "Candidate communication";
  const body = String(message?.body_text ?? "");
  const sender = String(message?.sender_email ?? "").trim();
  const recipient = String(message?.recipient_email ?? "").trim();
  const createdAt = String(message?.created_at ?? "");
  const sentAt = String(message?.sent_at ?? "");
  const state = deliveryLabel(message?.delivery_status ?? message?.status);
  const attempts = Math.max(0, Number(message?.attempt_count ?? 0) || 0);

  return `<article class="candidate-message" data-message-id="${esc(message?.id || "")}" style="padding:18px 0;border-bottom:1px solid var(--line)">
    <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap">
      <div style="min-width:0;flex:1">
        <div class="activity-type">${esc(messageDirection(message?.direction))} email · ${esc(state)}</div>
        <h3 style="margin:4px 0 0;font-size:14px;color:var(--ink)">${esc(subject)}</h3>
      </div>
      <div style="font-size:11px;color:var(--muted);text-align:right">
        <time datetime="${esc(createdAt)}">${esc(prettyTime(createdAt))}</time>
        ${sentAt ? `<div>Sent ${esc(prettyTime(sentAt))}</div>` : ""}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 18px;margin-top:10px;font-size:11px">
      <div><span style="color:var(--muted)">From</span><br><strong>${esc(sender || "—")}</strong></div>
      <div><span style="color:var(--muted)">To</span><br><strong>${esc(recipient || "—")}</strong></div>
    </div>
    <div style="margin-top:12px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.65;color:var(--ink)">${esc(body)}</div>
    ${attempts > 1 ? `<div style="margin-top:8px;font-size:10px;color:var(--muted)">Delivery attempts: ${esc(attempts)}</div>` : ""}
  </article>`;
}

export function renderCandidateCommunicationHistory(messages: unknown): string {
  const rows = Array.isArray(messages) ? messages.slice(0, 100) : [];
  if (!rows.length) {
    return `<div class="empty">No candidate communication has been recorded for this application.</div>`;
  }
  return rows.map(messageCard).join("");
}

export function candidateCommunicationCount(messages: unknown): number {
  return Array.isArray(messages) ? Math.min(messages.length, 100) : 0;
}

type CandidateMessageDraft = {
  subject?: string;
  body?: string;
  requestId?: string;
  preview?: boolean;
  validationError?: string;
  templateKey?: string;
};

function templatePicker(basePath: string, applicationId: string, selectedKey: string): string {
  const links = CANDIDATE_MESSAGE_TEMPLATE_OPTIONS.map((option) => {
    const selected = selectedKey === option.key;
    return `<a class="btn secondary" style="min-height:32px;padding:6px 9px;font-size:10px" href="${basePath}/applications/${esc(applicationId)}?template=${encodeURIComponent(option.key)}#candidate-message-compose-title"${selected ? ' aria-current="true"' : ""}>${esc(option.label)}</a>`;
  }).join("");
  return `<div style="margin-bottom:14px"><div class="activity-type" style="margin-bottom:7px">Controlled templates</div><div class="actions" style="margin:0;gap:6px;flex-wrap:wrap">${links}</div><p class="muted" style="margin:8px 0 0;font-size:10px">Templates use only persisted candidate/job fields. Review and preview the message before sending.</p></div>`;
}

export function renderCandidateMessageComposer(
  basePath: string,
  csrf: string,
  application: any,
  draft: CandidateMessageDraft = {}
): string {
  const applicationId = String(application?.id ?? "");
  const recipient = String(application?.email ?? "").trim();
  const subject = String(draft.subject ?? "");
  const body = String(draft.body ?? "");
  const requestId = String(draft.requestId ?? crypto.randomUUID());
  const preview = draft.preview === true;
  const error = String(draft.validationError ?? "").trim();
  const templateKey = String(draft.templateKey ?? "");

  const composeForm = `${templatePicker(basePath, applicationId, templateKey)}<form method="post" action="${basePath}/applications/${esc(applicationId)}/message" style="display:grid;gap:12px">
    <input type="hidden" name="csrf" value="${esc(csrf)}">
    <input type="hidden" name="request_id" value="${esc(requestId)}">
    <input type="hidden" name="intent" value="preview">
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
      <div class="identity-row"><span>From</span><strong>careers@rcitcs.com</strong></div>
      <div class="identity-row"><span>To</span><strong>${esc(recipient || "Persisted candidate email unavailable")}</strong></div>
    </div>
    <div><label for="candidate-message-subject" style="display:block;font-size:10px;font-weight:750;margin-bottom:5px">Subject</label><input id="candidate-message-subject" name="subject" required maxlength="${CANDIDATE_MESSAGE_SUBJECT_MAX}" value="${esc(subject)}" style="width:100%;min-height:40px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px"></div>
    <div><label for="candidate-message-body" style="display:block;font-size:10px;font-weight:750;margin-bottom:5px">Message</label><textarea id="candidate-message-body" name="body" required maxlength="${CANDIDATE_MESSAGE_BODY_MAX}" rows="9" style="width:100%;border:1px solid var(--line-strong);border-radius:3px;padding:10px;resize:vertical;line-height:1.55">${esc(body)}</textarea></div>
    ${error ? `<div class="msg error" role="alert">${esc(error)}</div>` : ""}
    <div class="actions" style="margin:0"><button class="btn primary" type="submit">Preview message</button></div>
  </form>`;

  if (!preview) return composeForm;

  const confirmation = `<section aria-labelledby="candidate-message-preview-title" style="margin-top:18px;border-top:1px solid var(--line);padding-top:18px">
    <div class="eyebrow">Final preview</div>
    <h3 id="candidate-message-preview-title" style="margin:5px 0 12px;font-size:15px">${esc(subject)}</h3>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 18px;font-size:11px;margin-bottom:12px"><div><span style="color:var(--muted)">From</span><br><strong>careers@rcitcs.com</strong></div><div><span style="color:var(--muted)">To</span><br><strong>${esc(recipient)}</strong></div></div>
    <div style="white-space:pre-wrap;overflow-wrap:anywhere;padding:14px;border:1px solid var(--line);background:var(--surface-subtle);font-size:12px;line-height:1.65">${esc(body)}</div>
    <form method="post" action="${basePath}/applications/${esc(applicationId)}/message" style="margin-top:14px">
      <input type="hidden" name="csrf" value="${esc(csrf)}">
      <input type="hidden" name="request_id" value="${esc(requestId)}">
      <input type="hidden" name="intent" value="send">
      <input type="hidden" name="subject" value="${esc(subject)}">
      <textarea name="body" hidden>${esc(body)}</textarea>
      <div class="actions" style="margin:0"><button class="btn primary" type="submit">Send candidate email</button><a class="btn secondary" href="${basePath}/applications/${esc(applicationId)}">Cancel</a></div>
    </form>
  </section>`;

  return `${composeForm}${confirmation}`;
}

export function renderCandidateStatusWorkflow(basePath: string, csrf: string, application: any): string {
  const applicationId = String(application?.id ?? "");
  const current = String(application?.status ?? "submitted").trim().toLowerCase();
  const version = Number(application?.version ?? 0);
  const allowed = STATUS_TRANSITIONS[current] ?? [];
  const options = allowed.map((status) => `<option value="${esc(status)}">${esc(statusLabel(status))}</option>`).join("");
  const prior = current === "archived" ? String(application?.archived_from_status ?? "under_review") : "";

  if (!Number.isSafeInteger(version) || version < 1 || !applicationId || !allowed.length) {
    return `<div class="empty">Recruitment-stage workflow is unavailable for this application. Reload the record before attempting a change.</div>`;
  }

  return `<form method="post" action="${basePath}/applications/${esc(applicationId)}/status" style="display:grid;gap:10px">
    <input type="hidden" name="csrf" value="${esc(csrf)}">
    <input type="hidden" name="expected_version" value="${esc(version)}">
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
      <div class="identity-row"><span>Current stage</span><strong>${esc(statusLabel(current))}</strong></div>
      <div class="identity-row"><span>Record version</span><strong>${esc(version)}</strong></div>
    </div>
    ${current === "archived" ? `<div class="msg" role="status">Restore returns this application to <strong>${esc(statusLabel(prior))}</strong>. No email is sent.</div>` : ""}
    <div><label for="candidate-target-status" style="display:block;font-size:10px;font-weight:750;margin-bottom:5px">Next stage</label><select id="candidate-target-status" name="target_status" required style="width:100%;min-height:40px;border:1px solid var(--line-strong);border-radius:3px;padding:8px 10px;background:#fff"><option value="">Select a permitted stage</option>${options}</select></div>
    <div><label for="candidate-status-notes" style="display:block;font-size:10px;font-weight:750;margin-bottom:5px">Internal transition note <span style="font-weight:500;color:var(--muted)">(optional)</span></label><textarea id="candidate-status-notes" name="notes" maxlength="${CANDIDATE_STATUS_NOTES_MAX}" rows="3" style="width:100%;border:1px solid var(--line-strong);border-radius:3px;padding:10px;resize:vertical;line-height:1.5"></textarea></div>
    <p class="muted" style="margin:0;font-size:10px"><strong>Status and email are separate operations.</strong> Updating the recruitment stage never sends candidate email automatically.</p>
    <div class="actions" style="margin:0"><button class="btn secondary" type="submit">Update stage</button></div>
  </form>`;
}
