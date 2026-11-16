import { test } from "node:test";
import assert from "node:assert/strict";
import { orderGroups, orderPayloadLines, removeDesign, splitDesign } from "../src/lib/orderDesigns.js";

test("20 units can become 20 independent designs while retaining the original allocation total", () => {
  const original = { localId: "first", productId: "tee", color: "#ffffff", size: "M", quantity: 20,
    design: { front: [{ text: "original" }], back: [] } };
  let lines = [original];
  for (let i = 2; i <= 20; i++) lines = splitDesign(lines, "first", "design-" + i);
  const [group] = orderGroups(lines);
  assert.equal(group.quantity, 20);
  assert.equal(group.variants.length, 20);
  assert.deepEqual(group.variants.map(line => line.quantity), Array(20).fill(1));
  assert.equal(group.variants[0].design.front[0].text, "original");
  assert.deepEqual(group.variants[19].design, { front: [], back: [] });
  assert.equal(original.quantity, 20);
  assert.equal(splitDesign(lines, "first", "extra"), lines);
  const payload = orderPayloadLines(orderGroups(removeDesign(lines, "first", "first")));
  assert.equal(payload.length, 19);
  assert.equal(payload[0].quantity, 2);
  assert.ok(payload.every(line => line.designGroupId === "first" && line.designGroupQuantity === 20));
  assert.equal(payload.reduce((sum, line) => sum + line.quantity, 0), 20);
});

test("a single design remains compatible with legacy order payloads", () => {
  const payload = orderPayloadLines(orderGroups([{ localId: "one", designGroupId: "old", quantity: 3 }]));
  assert.equal(payload[0].quantity, 3);
  assert.ok(!("designGroupId" in payload[0]));
});
