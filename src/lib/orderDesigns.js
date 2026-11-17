export const MAX_ORDER_LINES = 30;
export const MAX_PRODUCT_UNITS = 10000;

export function orderGroups(lines) {
  const groups = new Map();
  for (const line of lines) {
    const id = line.designGroupId || line.localId;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(line);
  }
  return Array.from(groups, ([id, variants]) => ({
    id,
    variants,
    quantity: variants.reduce((total, line) => total + line.quantity, 0),
  }));
}

export function splitDesign(lines, groupId, newId) {
  const group = orderGroups(lines).find(item => item.id === groupId);
  if (!group || lines.length >= MAX_ORDER_LINES) return lines;
  const donor = group.variants.reduce((largest, line) => line.quantity > largest.quantity ? line : largest);
  if (donor.quantity <= 1) return lines;
  const memberIds = new Set(group.variants.map(line => line.localId));
  const newDesign = {
    ...donor, localId: newId, designGroupId: groupId, quantity: 1,
    editing: false, editorSide: "front", design: { front: [], back: [] },
  };
  return [
    ...lines.map(line => memberIds.has(line.localId)
      ? { ...line, designGroupId: groupId, quantity: line.quantity - Number(line.localId === donor.localId) }
      : line),
    newDesign,
  ];
}

export function designCapacity(lineCount, group) {
  return Math.min(group.quantity, group.variants.length + Math.max(0, MAX_ORDER_LINES - lineCount));
}

export function splitDesignsTo(lines, groupId, target, makeId) {
  const group = orderGroups(lines).find(item => item.id === groupId);
  if (!group || !Number.isInteger(target)) return lines;
  const count = Math.min(target, designCapacity(lines.length, group));
  let next = lines;
  for (let index = group.variants.length; index < count; index++) {
    next = splitDesign(next, groupId, makeId());
  }
  return next;
}

export function removeDesign(lines, groupId, variantId) {
  const group = orderGroups(lines).find(item => item.id === groupId);
  const removed = group?.variants.find(line => line.localId === variantId);
  const recipient = group?.variants.find(line => line.localId !== variantId);
  if (!removed || !recipient) return lines;
  return lines.filter(line => line.localId !== variantId).map(line =>
    line.localId === recipient.localId ? { ...line, quantity: line.quantity + removed.quantity } : line
  );
}

export function orderPayloadLines(groups) {
  return groups.flatMap(group => group.variants.map(line => ({
    id: "line-" + line.localId,
    productId: line.productId,
    color: line.color,
    size: line.size,
    quantity: line.quantity,
    design: line.design,
    ...(group.variants.length > 1 && {
      designGroupId: group.id,
      designGroupQuantity: group.quantity,
    }),
  })));
}
