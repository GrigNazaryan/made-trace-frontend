import { test } from "node:test";
import assert from "node:assert/strict";
import { productDefaults, switchProductType } from "../src/lib/productDefaults.js";

test("changing the mockup type reverses automatic category and sizing", () => {
  const tee = { mockupType: "tee", ...productDefaults("tee"), name: "Test product" };
  const mug = switchProductType(tee, "mug", {});
  assert.equal(mug.category, "Drinkware");
  assert.equal(mug.sizes, "One size");
  const restored = switchProductType(mug, "tee", {});
  assert.equal(restored.category, "Apparel");
  assert.equal(restored.sizes, "S, M, L, XL");
  assert.equal(restored.name, tee.name);
});

test("switching mockups preserves explicitly edited category and sizes", () => {
  const product = { mockupType: "cap", category: "Custom", sizes: "M, XL" };
  const switched = switchProductType(product, "hoodie", { category: true, sizes: true });
  assert.equal(switched.category, "Custom");
  assert.equal(switched.sizes, "M, XL");
  assert.equal(switched.mockupType, "hoodie");
});
