export function orderPayment(order) {
  // New API responses explicitly indicate when the workshop expects payment.
  const due = order.paymentDue ?? ["ready", "completed"].includes(order.status);
  const link = order.workshop?.paymentLink;
  if (link) {
    try {
      const url = new URL(link);
      if (url.protocol === "https:" && !url.username && !url.password) {
        return { url: url.href, message: null };
      }
    } catch { /* An invalid link is unavailable. */ }
    return { url: null, message: "order_payment_missing" };
  }
  if (order.paymentAvailableAtReady) return { url: null, message: "order_pay_at_ready" };
  return { url: null, message: due ? "order_payment_missing" : null };
}
