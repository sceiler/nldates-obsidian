import { describe, it, expect } from "vitest";
import {
  parseTruthy,
  getLastDayOfMonth,
  getWeekNumber,
  parseOrdinalNumberPattern,
  ORDINAL_NUMBER_PATTERN,
} from "./utils";

describe("parseTruthy", () => {
  it("returns true for truthy strings", () => {
    expect(parseTruthy("yes")).toBe(true);
    expect(parseTruthy("y")).toBe(true);
    expect(parseTruthy("true")).toBe(true);
    expect(parseTruthy("t")).toBe(true);
    expect(parseTruthy("1")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(parseTruthy("YES")).toBe(true);
    expect(parseTruthy("True")).toBe(true);
    expect(parseTruthy("Y")).toBe(true);
  });

  it("returns false for falsy strings", () => {
    expect(parseTruthy("no")).toBe(false);
    expect(parseTruthy("false")).toBe(false);
    expect(parseTruthy("0")).toBe(false);
    expect(parseTruthy("")).toBe(false);
    expect(parseTruthy("random")).toBe(false);
  });
});

describe("getLastDayOfMonth", () => {
  it("returns correct last day for various months", () => {
    expect(getLastDayOfMonth(2024, 1)).toBe(31); // January
    expect(getLastDayOfMonth(2024, 2)).toBe(29); // Feb leap year
    expect(getLastDayOfMonth(2023, 2)).toBe(28); // Feb non-leap
    expect(getLastDayOfMonth(2024, 4)).toBe(30); // April
    expect(getLastDayOfMonth(2024, 12)).toBe(31); // December
  });
});

describe("getWeekNumber", () => {
  it("maps day names to correct indices", () => {
    expect(getWeekNumber("sunday")).toBe(0);
    expect(getWeekNumber("monday")).toBe(1);
    expect(getWeekNumber("tuesday")).toBe(2);
    expect(getWeekNumber("wednesday")).toBe(3);
    expect(getWeekNumber("thursday")).toBe(4);
    expect(getWeekNumber("friday")).toBe(5);
    expect(getWeekNumber("saturday")).toBe(6);
  });
});

describe("parseOrdinalNumberPattern", () => {
  it("parses ordinal word forms", () => {
    expect(parseOrdinalNumberPattern("first")).toBe(1);
    expect(parseOrdinalNumberPattern("second")).toBe(2);
    expect(parseOrdinalNumberPattern("tenth")).toBe(10);
    expect(parseOrdinalNumberPattern("twentieth")).toBe(20);
    expect(parseOrdinalNumberPattern("twenty-first")).toBe(21);
    expect(parseOrdinalNumberPattern("thirty-first")).toBe(31);
  });

  it("is case-insensitive", () => {
    expect(parseOrdinalNumberPattern("First")).toBe(1);
    expect(parseOrdinalNumberPattern("THIRD")).toBe(3);
  });

  it("parses numeric ordinals", () => {
    expect(parseOrdinalNumberPattern("1st")).toBe(1);
    expect(parseOrdinalNumberPattern("2nd")).toBe(2);
    expect(parseOrdinalNumberPattern("3rd")).toBe(3);
    expect(parseOrdinalNumberPattern("15th")).toBe(15);
    expect(parseOrdinalNumberPattern("31st")).toBe(31);
  });

  it("parses plain numbers", () => {
    expect(parseOrdinalNumberPattern("5")).toBe(5);
    expect(parseOrdinalNumberPattern("12")).toBe(12);
  });
});

describe("ORDINAL_NUMBER_PATTERN", () => {
  it("matches ordinal words", () => {
    const regex = new RegExp(ORDINAL_NUMBER_PATTERN);
    expect(regex.test("first")).toBe(true);
    expect(regex.test("twenty-first")).toBe(true);
    expect(regex.test("thirtieth")).toBe(true);
  });

  it("matches numeric ordinals", () => {
    const regex = new RegExp(ORDINAL_NUMBER_PATTERN);
    expect(regex.test("1st")).toBe(true);
    expect(regex.test("2nd")).toBe(true);
    expect(regex.test("15th")).toBe(true);
  });

  it("matches plain numbers", () => {
    const regex = new RegExp(ORDINAL_NUMBER_PATTERN);
    expect(regex.test("5")).toBe(true);
    expect(regex.test("31")).toBe(true);
  });
});
