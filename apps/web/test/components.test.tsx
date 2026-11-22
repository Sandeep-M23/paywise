import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { GenderGapGroup, SalaryRevision } from "@paywise/shared";
import { SalaryHistory } from "../components/block/employees/SalaryHistory";
import { GapStatus } from "../components/block/fairness/GapStatus";
import { ImportSteps } from "../components/block/import/ImportSteps";
import { PasswordInput } from "../components/shared/PasswordInput/PasswordInput";

afterEach(cleanup);

const revision = (patch: Partial<SalaryRevision>): SalaryRevision => ({
  id: crypto.randomUUID(),
  amount: 180_000_000,
  previousAmount: null,
  currency: "inr",
  effectiveOn: "2026-04-01",
  reason: "merit",
  note: null,
  importId: null,
  correctsRevisionId: null,
  state: "historical",
  createdBy: "hr@acme.test",
  createdAt: "2026-04-01T09:00:00Z",
  ...patch,
});

describe("SalaryHistory", () => {
  const revisions = [
    revision({ state: "scheduled", effectiveOn: "2027-04-01", reason: "promotion" }),
    revision({ state: "cancelled", effectiveOn: "2027-01-01" }),
    revision({ state: "current", effectiveOn: "2026-04-01", createdBy: "priya@acme.test" }),
    revision({ state: "corrected", effectiveOn: "2026-04-01" }),
    revision({
      state: "historical",
      effectiveOn: "2022-04-01",
      reason: "hire",
      createdBy: "system",
    }),
  ];

  it("labels each entry's state and who recorded it", () => {
    render(<SalaryHistory revisions={revisions} countryCode="IN" />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]!.textContent).toContain("Scheduled · from 1 Apr 2027");
    expect(items[1]!.textContent).toContain("Cancelled");
    expect(items[2]!.textContent).toContain("Current");
    expect(items[2]!.textContent).toContain("by priya@acme.test");
    expect(items[3]!.textContent).toContain("Corrected");
    expect(items[4]!.textContent).toContain("Hired");
  });

  it("offers Correct only on entries still in effect, and only when allowed", () => {
    const onCorrect = vi.fn();
    const { rerender } = render(
      <SalaryHistory revisions={revisions} countryCode="IN" onCorrect={onCorrect} />,
    );
    const items = screen.getAllByRole("listitem");
    const hasCorrect = items.map(
      (item) => within(item).queryByRole("button", { name: "Correct" }) !== null,
    );
    expect(hasCorrect).toEqual([true, false, true, false, true]);

    fireEvent.click(within(items[2]!).getByRole("button", { name: "Correct" }));
    expect(onCorrect).toHaveBeenCalledWith(revisions[2]);

    rerender(<SalaryHistory revisions={revisions} countryCode="IN" />);
    expect(screen.queryByRole("button", { name: "Correct" })).toBeNull();
  });
});

describe("GapStatus", () => {
  const group = (patch: Partial<GenderGapGroup>) =>
    ({ suppressed: false, flagged: false, significant: false, ...patch }) as GenderGapGroup;

  it.each([
    [{ suppressed: true }, "Too few to report"],
    [{ flagged: true, significant: true }, "Potential disparity (≥ 5%)"],
    [{ flagged: true }, "≥ 5%, may be chance"],
    [{}, "Within 5%"],
  ])("shows %j as %s", (patch, label) => {
    render(<GapStatus group={group(patch)} />);
    expect(screen.getByText(label)).toBeTruthy();
  });
});

describe("PasswordInput", () => {
  it("shows and hides the password without losing it", () => {
    render(<PasswordInput aria-label="Password" defaultValue="s3cret" />);
    const input = screen.getByLabelText("Password") as HTMLInputElement;
    expect(input.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input.type).toBe("text");
    expect(input.value).toBe("s3cret");

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input.type).toBe("password");
  });
});

describe("ImportSteps", () => {
  it("marks the current step", () => {
    render(<ImportSteps step="preview" />);
    const current = screen.getAllByRole("listitem").find((li) => li.getAttribute("aria-current"));
    expect(current?.textContent).toBe("3. Review");
  });
});
