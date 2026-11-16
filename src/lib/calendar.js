const day = 86_400_000;
const iso = date => date.toISOString().slice(0, 10);

export function calendarDates(value, view) {
  const date = new Date(value + "T00:00:00Z");
  if (view === "day") return [iso(date)];
  if (view === "month") date.setUTCDate(1);
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return Array.from({ length: view === "week" ? 7 : 42 }, (_, index) => iso(new Date(+date + day * index)));
}

export function calendarJobs(orders, dates) {
  const scheduleFields = ["productionStart", "productionDue", "estimatedDate", "promisedDate"];
  const days = new Map(dates.map(date => [date, []]));
  for (const order of orders) {
    const ownDates = new Map();
    for (const key of scheduleFields) {
      const date = order.schedule?.[key];
      if (!days.has(date)) continue;
      if (!ownDates.has(date)) ownDates.set(date, []);
      ownDates.get(date).push(key);
    }
    for (const [date, fields] of ownDates) days.get(date).push({ order, fields });
  }
  return days;
}
