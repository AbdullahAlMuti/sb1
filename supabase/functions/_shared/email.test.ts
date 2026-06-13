// node --experimental-strip-types --test
import test from "node:test";
import assert from "node:assert/strict";

import { buildEmailContent, formatAmount } from "./email.ts";

// ── formatAmount ──────────────────────────────────────────────────────────────

test("formatAmount: converts cents to USD string", () => {
  assert.equal(formatAmount(100, "usd"), "$1.00");
  assert.equal(formatAmount(1500, "usd"), "$15.00");
  assert.equal(formatAmount(4900, "usd"), "$49.00");
  assert.equal(formatAmount(14400, "usd"), "$144.00");
  assert.equal(formatAmount(47040, "usd"), "$470.40");
});

test("formatAmount: defaults to USD when currency omitted", () => {
  assert.ok(formatAmount(999).startsWith("$"));
});

// ── trial_started ─────────────────────────────────────────────────────────────

test("trial_started: subject and key HTML content", () => {
  const { subject, html } = buildEmailContent({
    to: "alice@example.com",
    type: "trial_started",
    userName: "Alice",
    trialEndDate: "2026-06-20T12:00:00Z",
  });
  assert.ok(subject.toLowerCase().includes("trial"), "subject should mention trial");
  assert.ok(html.includes("Alice"), "html should include user name");
  assert.ok(html.includes("$1"), "html should mention $1 trial price");
  assert.ok(html.includes("June 20, 2026"), "html should include formatted trial end date");
  assert.ok(html.includes("dashboard"), "html should link to dashboard");
});

test("trial_started: works without optional fields", () => {
  const { subject, html } = buildEmailContent({
    to: "x@example.com",
    type: "trial_started",
  });
  assert.ok(subject.length > 0);
  assert.ok(html.includes("$1"));
});

// ── subscription_activated ────────────────────────────────────────────────────

test("subscription_activated: includes plan name in subject and html", () => {
  const { subject, html } = buildEmailContent({
    to: "bob@example.com",
    type: "subscription_activated",
    userName: "Bob",
    planName: "Pro",
  });
  assert.ok(subject.includes("Pro"), "subject should include plan name");
  assert.ok(html.includes("Pro"), "html should include plan name");
  assert.ok(html.includes("Bob"), "html should include user name");
  assert.ok(html.includes("5,000"), "Pro html should show 5,000 listings");
  assert.ok(html.includes("1,500"), "Pro html should show 1,500 credits");
});

test("subscription_activated: Starter shows correct limits", () => {
  const { html } = buildEmailContent({
    to: "carol@example.com",
    type: "subscription_activated",
    planName: "Starter",
  });
  assert.ok(html.includes("500"), "Starter html should show 500 listings");
});

// ── payment_receipt ───────────────────────────────────────────────────────────

test("payment_receipt: formats amount in subject and html", () => {
  const { subject, html } = buildEmailContent({
    to: "dave@example.com",
    type: "payment_receipt",
    userName: "Dave",
    planName: "Starter",
    amountCents: 1500,
    currency: "usd",
    invoiceUrl: "https://invoice.stripe.com/i/acct_test/test_123",
    nextBillingDate: "2026-07-13T00:00:00Z",
  });
  assert.ok(subject.includes("$15.00"), "subject should show formatted amount");
  assert.ok(html.includes("$15.00"), "html should show formatted amount");
  assert.ok(html.includes("invoice.stripe.com"), "html should include invoice link");
  assert.ok(html.includes("July 13, 2026"), "html should include next billing date");
  assert.ok(html.includes("Dave"), "html should include user name");
});

test("payment_receipt: no invoice url is graceful", () => {
  const { html } = buildEmailContent({
    to: "e@example.com",
    type: "payment_receipt",
    amountCents: 4900,
    currency: "usd",
  });
  assert.ok(html.includes("$49.00"));
  assert.ok(!html.includes("undefined"), "no undefined strings in html");
});

// ── payment_failed ────────────────────────────────────────────────────────────

test("payment_failed: subject flags action required", () => {
  const { subject, html } = buildEmailContent({
    to: "frank@example.com",
    type: "payment_failed",
    amountCents: 4900,
    currency: "usd",
  });
  assert.ok(
    subject.toLowerCase().includes("action") || subject.toLowerCase().includes("fail"),
    "subject should flag urgency",
  );
  assert.ok(html.includes("$49.00"), "html should include the failed amount");
  assert.ok(html.toLowerCase().includes("payment"), "html should mention payment");
});

test("payment_failed: works without amount", () => {
  const { subject, html } = buildEmailContent({
    to: "g@example.com",
    type: "payment_failed",
  });
  assert.ok(subject.length > 0);
  assert.ok(!html.includes("undefined"));
});

// ── subscription_cancelled ────────────────────────────────────────────────────

test("subscription_cancelled: subject and resubscribe cta", () => {
  const { subject, html } = buildEmailContent({
    to: "helen@example.com",
    type: "subscription_cancelled",
    planName: "Starter",
  });
  assert.ok(
    subject.toLowerCase().includes("cancel") || subject.toLowerCase().includes("ended"),
    "subject should indicate cancellation",
  );
  assert.ok(html.includes("Starter"), "html should include plan name");
  assert.ok(html.toLowerCase().includes("resubscri"), "html should offer resubscribe path");
});

// ── no undefined bleed-through ────────────────────────────────────────────────

test("no template outputs the string 'undefined'", () => {
  const types = [
    "trial_started",
    "subscription_activated",
    "payment_receipt",
    "payment_failed",
    "subscription_cancelled",
  ] as const;
  for (const type of types) {
    const { subject, html } = buildEmailContent({ to: "x@x.com", type });
    assert.ok(!subject.includes("undefined"), `${type} subject has 'undefined'`);
    assert.ok(!html.includes("undefined"), `${type} html has 'undefined'`);
  }
});
