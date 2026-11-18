const apparelSizes = "S, M, L, XL";

export function productDefaults(type) {
  if (type === "mug") return { category: "Drinkware", sizes: "One size" };
  if (type === "cap") return { category: "Headwear", sizes: "One size" };
  if (type === "reference") return { category: "Apparel", sizes: "" };
  return { category: "Apparel", sizes: apparelSizes };
}

export function switchProductType(current, type, custom) {
  if (current.mockupType === type) return current;
  const defaults = productDefaults(type);
  return {
    ...current,
    mockupType: type,
    printAreas: { _preset: { version: 2 } },
    category: custom.category ? current.category : defaults.category,
    sizes: custom.sizes ? current.sizes : defaults.sizes,
  };
}
