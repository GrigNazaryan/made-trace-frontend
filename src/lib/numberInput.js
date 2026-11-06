export const normalizeNumberText = value => String(value).replace(/^(-?)0+(?=\d)/, "$1");
export const numberOnBlur = (text, min) => text === "" ? String(Math.max(0, Number(min) || 0)) : normalizeNumberText(text);
