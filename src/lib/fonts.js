// System fonts only — no remote font requests. Keep this list in sync with the backend's
// FONTS set in domain/validation.py, or a chosen font will be rejected as invalid on submit.
export const designFonts = [
  ["Arial", "Arial, sans-serif"],
  ["Segoe UI", '"Segoe UI", Arial, sans-serif'],
  ["Verdana", "Verdana, Arial, sans-serif"],
  ["Tahoma", "Tahoma, Arial, sans-serif"],
  ["Trebuchet MS", '"Trebuchet MS", Arial, sans-serif'],
  ["Calibri", "Calibri, Arial, sans-serif"],
  ["Candara", "Candara, Arial, sans-serif"],
  ["Century Gothic", '"Century Gothic", Arial, sans-serif'],
  ["Bahnschrift", "Bahnschrift, Arial, sans-serif"],
  ["Impact", "Impact, Arial, sans-serif"],
  ["Georgia", 'Georgia, "Times New Roman", serif'],
  ["Times New Roman", '"Times New Roman", serif'],
  ["Cambria", "Cambria, Georgia, serif"],
  ["Constantia", "Constantia, Georgia, serif"],
  ["Palatino Linotype", '"Palatino Linotype", Georgia, serif'],
  ["Courier New", '"Courier New", monospace'],
  ["Consolas", 'Consolas, "Courier New", monospace'],
];

export const fontStack = (name) => designFonts.find(([label]) => label === name)?.[1] || "Arial, sans-serif";
