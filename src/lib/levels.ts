export const LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
export type Level = (typeof LEVELS)[number];

export const LOWERCASE_LEVELS = {
  N5: "n5",
  N4: "n4",
  N3: "n3",
  N2: "n2",
  N1: "n1",
} as const satisfies Record<Level, string>;
export type LowercaseLevel = (typeof LOWERCASE_LEVELS)[Level];
