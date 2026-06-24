import { describe as group, it, expect } from "vitest";
import { findDeadFlags } from "../../scripts/check-dead-flags.mjs";

group("findDeadFlags", () => {
  it("returns flags that never appear in the source text", () => {
    const haystack = 'isEnabled("alpha"); isEnabled("gamma")';
    expect(findDeadFlags(["alpha", "beta", "gamma"], haystack)).toEqual(["beta"]);
  });

  it("returns an empty array when every flag is referenced", () => {
    const haystack = 'isEnabled("alpha"); ff_beta';
    expect(findDeadFlags(["alpha", "beta"], haystack)).toEqual([]);
  });

  it("sorts the reported dead flag keys", () => {
    expect(findDeadFlags(["zeta", "alpha", "mu"], "")).toEqual(["alpha", "mu", "zeta"]);
  });

  it("treats an empty flag list as having no dead flags", () => {
    expect(findDeadFlags([], "anything")).toEqual([]);
  });
});
