import { esc, prettyTime } from "./ui.ts";

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

function deliveryLabel(value: unknown): string {
  const state = String(value ?? "queued").trim().toLowerCase();
  const safe = SAFE_DELIVERY_STATES.has(state) ? state : "queued";
  return safe.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
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
