/** Exhaust the authorized cursor so summary counts are based on all visible orders. */
export async function collectOrderPages(fetchPage, params = {}, active = () => true) {
  const orders = [];
  const limit = 100;
  let before;
  while (active()) {
    const page = await fetchPage({ ...params, before, limit });
    orders.push(...page);
    if (page.length < limit) return orders;
    const next = page.at(-1).id;
    if (next === before) throw new Error("Order cursor did not advance");
    before = next;
  }
  return [];
}
