import * as chrono from "chrono-node";
import { Chrono } from "chrono-node";
import type { Parser } from "chrono-node";
import type { Moment } from "moment";

import type { DayOfWeek } from "./settings";
import {
    ORDINAL_NUMBER_PATTERN,
    getLastDayOfMonth,
    getLocaleWeekStart,
    getWeekNumber,
    parseOrdinalNumberPattern,
} from "./utils";

export interface NLDResult {
  formattedString: string;
  date: Date;
  moment: Moment;
}

// Pre-compile frequently used regex patterns for better performance
const CHRISTMAS_PATTERN = /\bChristmas\b/i;
const ORDINAL_REGEX = new RegExp(ORDINAL_NUMBER_PATTERN);
const THIS_PATTERN = /this\s([\w]+)/i;
const NEXT_PATTERN = /next\s([\w]+)/i;
const LAST_DAY_PATTERN = /(last day of|end of)\s*([^\n\r]*)/i;
const MID_PATTERN = /mid\s([\w]+)/i;

function getLocalizedChrono(): Chrono {
  const locale = window.moment.locale();

  switch (locale) {
    case "en-gb":
      return new Chrono(chrono.en.createCasualConfiguration(true));
    default:
      return new Chrono(chrono.en.createCasualConfiguration(false));
  }
}

function getConfiguredChrono(): Chrono {
  const localizedChrono = getLocalizedChrono();
  localizedChrono.parsers.push({
    pattern: () => CHRISTMAS_PATTERN,
    extract: () => {
      return {
        day: 25,
        month: 12,
      };
    },
  });

  localizedChrono.parsers.push({
    pattern: () => ORDINAL_REGEX,
    extract: (_context, match) => {
      return {
        day: parseOrdinalNumberPattern(match[0]),
        month: window.moment().month(),
      };
    },
  } as Parser);
  return localizedChrono;
}

export default class NLDParser {
  chrono: Chrono;
  private referenceDate: Date;

  constructor() {
    this.chrono = getConfiguredChrono();
    this.referenceDate = new Date();
  }

  // Cache reference date and update periodically to avoid constant new Date() calls
  private updateReferenceDate(): void {
    this.referenceDate = new Date();
  }

  getParsedDate(selectedText: string, weekStartPreference: DayOfWeek): Date {
    const parser = this.chrono;

    const weekStart =
      weekStartPreference === "locale-default"
        ? getLocaleWeekStart()
        : weekStartPreference;

    const locale = {
      weekStart: getWeekNumber(weekStart),
    };

    // Use pre-compiled regex patterns
    const thisDateMatch = selectedText.match(THIS_PATTERN);
    const nextDateMatch = selectedText.match(NEXT_PATTERN);
    const lastDayOfMatch = selectedText.match(LAST_DAY_PATTERN);
    const midOf = selectedText.match(MID_PATTERN);

    // Update reference date periodically (every 60 seconds) instead of every call
    const now = Date.now();
    if (now - this.referenceDate.getTime() > 60000) {
      this.updateReferenceDate();
    }

    if (thisDateMatch && thisDateMatch[1] === "week") {
      return parser.parseDate(`this ${weekStart}`, this.referenceDate);
    }

    if (nextDateMatch && nextDateMatch[1] === "week") {
      return parser.parseDate(`next ${weekStart}`, this.referenceDate, {
        forwardDate: true,
      });
    }

    if (nextDateMatch && nextDateMatch[1] === "month") {
      const thisMonth = parser.parseDate("this month", this.referenceDate, {
        forwardDate: true,
      });
      return parser.parseDate(selectedText, thisMonth, {
        forwardDate: true,
      });
    }

    if (nextDateMatch && nextDateMatch[1] === "year") {
      const thisYear = parser.parseDate("this year", this.referenceDate, {
        forwardDate: true,
      });
      return parser.parseDate(selectedText, thisYear, {
        forwardDate: true,
      });
    }

    if (lastDayOfMatch) {
      const tempDate = parser.parse(lastDayOfMatch[2]);
      if (tempDate.length > 0 && tempDate[0].start) {
        const year = tempDate[0].start.get("year");
        const month = tempDate[0].start.get("month");
        const lastDay = getLastDayOfMonth(year, month);

        return parser.parseDate(`${year}-${month}-${lastDay}`, this.referenceDate, {
          forwardDate: true,
        });
      }
    }

    if (midOf) {
      return parser.parseDate(`${midOf[1]} 15th`, this.referenceDate, {
        forwardDate: true,
      });
    }

    return parser.parseDate(selectedText, this.referenceDate, { locale });
  }
}
