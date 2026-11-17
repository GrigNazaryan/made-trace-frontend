import assert from "node:assert/strict";
import test from "node:test";
import { searchWorkshops } from "../src/lib/workshopSearch.js";

const workshops = [
  { id: "1", name: "Northline Print Studio", country: "US", city: "Brooklyn", services: ["Screen Printing"] },
  { id: "2", name: "Cologne Custom", country: "DE", city: "Cologne", services: ["DTF"] },
];

test("original directory supports location aliases, Cyrillic, prefixes and service aliases", () => {
  for (const search of ["New York", "Бруклин", "North", "Siebdruck"]) {
    assert.deepEqual(searchWorkshops(workshops, { search }).rows.map(row => row.id), ["1"]);
  }
  assert.deepEqual(searchWorkshops(workshops, { search: "Köln" }).rows.map(row => row.id), ["2"]);
});

test("typo suggestions use a matching public listing and respect filters", () => {
  const result = searchWorkshops(workshops, { search: "Colonge" });
  assert.deepEqual(result.rows.map(row => row.id), []);
  const close = searchWorkshops(workshops, { search: "Colognr" });
  assert.equal(close.suggestion, "cologne");
  assert.deepEqual(searchWorkshops(workshops, { search: "Colognr", country: "US" }).rows, []);
});
