import { describe, expect, it } from "vitest";
import { marginUsd, pairPrice, pnlUsd, STARTING_BALANCE } from "../src/lib/trading.js";

const rates = { USD: 1, EUR: 0.8, JPY: 150, GBP: 0.75 };

describe("trading math", () => {
  it("new accounts start with 10,000 practice dollars", () => {
    expect(STARTING_BALANCE).toBe(10000);
  });
  it("prices EUR/USD from USD-based rates", () => {
    expect(pairPrice("EUR/USD", rates)).toBeCloseTo(1.25);
  });
  it("buy profits when price rises", () => {
    expect(pnlUsd("EUR/USD", "buy", 10000, 1.25, 1.26, rates)).toBe(100);
  });
  it("sell loses when price rises", () => {
    expect(pnlUsd("EUR/USD", "sell", 10000, 1.25, 1.26, rates)).toBe(-100);
  });
  it("converts JPY profit to USD", () => {
    expect(pnlUsd("USD/JPY", "buy", 1000, 150, 151.5, rates)).toBe(10);
  });
  it("uses 1:100 leverage for margin", () => {
    expect(marginUsd("USD/JPY", 100000, rates)).toBe(1000);
  });
});
