import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarDates, calendarJobs } from "../src/lib/calendar.js";
import { collectOrderPages } from "../src/lib/orderPages.js";

test("same-day orders remain distinct and dates stay calendar dates", () => {
  const week = calendarDates("2026-11-18", "week");
  assert.equal(week[0], "2026-11-16");
  assert.equal(week.at(-1), "2026-11-22");
  assert.equal(calendarDates("2026-11-15", "month").length, 42);
  const jobs = calendarJobs([
    { id: "A", schedule: { productionStart: week[0], productionDue: week[0] } },
    { id: "B", schedule: { promisedDate: week[0] } },
  ], week).get(week[0]);
  assert.deepEqual(jobs.map(({ order, fields }) => [order.id, fields.length]), [["A", 2], ["B", 1]]);
});

test("order collection keeps the authorized cursor until a short page is reached", async () => {
  const rows = Array.from({ length: 301 }, (_, index) => ({ id: "MT-" + index }));
  const result = await collectOrderPages(({ limit, before }) => {
    const start = before ? rows.findIndex(row => row.id === before) + 1 : 0;
    return rows.slice(start, start + limit);
  });
  assert.deepEqual(result, rows);
});
