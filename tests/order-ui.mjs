import { test } from "node:test";
import assert from "node:assert/strict";
import { orderPayment } from "../src/lib/orderPayment.js";
import orderLabels from "../src/lib/i18n/order-ui.js";

test("eligible orders expose the HTTPS payment action; absent or unsafe links show an explanation", () => {
  const ready = { status: "ready", paymentDue: true, workshop: { paymentLink: "https://example.com/pay" } };
  assert.deepEqual(orderPayment(ready), { url: "https://example.com/pay", message: null });
  for (const paymentLink of ["", "http://example.com/pay", "https://user:password@example.com/pay"]) {
    assert.deepEqual(orderPayment({ ...ready, workshop: { paymentLink } }), { url: null, message: "order_payment_missing" });
  }
  assert.deepEqual(orderPayment({ status: "production", paymentDue: false, paymentAvailableAtReady: true }),
    { url: null, message: "order_pay_at_ready" });
  assert.deepEqual(orderPayment({ status: "request", paymentDue: false }), { url: null, message: null });
});

test("the five language dictionaries include each new label and the Armenian strings are Unicode Armenian", () => {
  for (const locale of ["en", "ru", "hy", "de", "fr"]) {
    assert.ok(orderLabels[locale].design_split_all.includes("{count}"));
    assert.ok(Object.values(orderLabels[locale]).every(value => typeof value === "string" && value.trim()));
  }
  assert.match(orderLabels.hy.order_payment_missing, /[\u0531-\u0587]/);
  assert.doesNotMatch(Object.values(orderLabels.hy).join(" "), /\uFFFD|[А-Яа-я]/);
});
