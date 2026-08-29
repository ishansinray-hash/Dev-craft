export type Domain = "tailor" | "baker" | "electrician" | "tiffin";

// Regex pattern to detect references to previous orders
// Matches patterns like: pichli baar, last time, pichla order, etc.
export const PRIOR_ORDER = /\b(pichli|pichla|pichle|pichla|last|previous)\s+(baar|time|order|wala|order)\b/i;

// Blocking attributes by domain - attributes that are essential to fulfill an order
// If these attributes are missing from ALL items, needs_clarification should be true
export const BLOCKING: Partial<Record<Domain, string>> = {
  baker: "flavour",
  electrician: "issue",
};
