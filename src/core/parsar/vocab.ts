export type Domain = "tailor" | "baker" | "electrician" | "tiffin";

// Blocking attributes by domain - attributes that are essential to fulfill an order
// If these attributes are missing from ALL items, needs_clarification should be true
export const BLOCKING: Partial<Record<Domain, string>> = {
  baker: "flavour",
  electrician: "issue",
};
