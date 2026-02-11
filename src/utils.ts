import type { Moment } from "moment";
import { App, Editor, EditorPosition, EditorRange, normalizePath, TFile } from "obsidian";
import {
    createDailyNote,
    getAllDailyNotes,
    getDailyNote,
} from "obsidian-daily-notes-interface";

import { DayOfWeek } from "./settings";

const daysOfWeek: Omit<DayOfWeek, "locale-default">[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

// Cache for expensive moment operations
let cachedLocaleData: ReturnType<typeof window.moment.localeData> | null = null;
let cachedWeekdays: string[] | null = null;
let lastLocaleCheck = 0;
const LOCALE_CACHE_DURATION = 60000; // 1 minute

function getCachedLocaleData() {
  const now = Date.now();
  if (!cachedLocaleData || now - lastLocaleCheck > LOCALE_CACHE_DURATION) {
    cachedLocaleData = window.moment.localeData();
    lastLocaleCheck = now;
  }
  return cachedLocaleData;
}

export function getCachedWeekdays() {
  const now = Date.now();
  if (!cachedWeekdays || now - lastLocaleCheck > LOCALE_CACHE_DURATION) {
    cachedWeekdays = window.moment.weekdays();
    lastLocaleCheck = now;
  }
  return cachedWeekdays;
}

export default function getWordBoundaries(editor: Editor): EditorRange | null {
  const cursor = editor.getCursor();

  try {
    const pos = editor.posToOffset(cursor);
    const editorWithCM = editor as Editor & { cm: { state: { wordAt: (pos: number) => { from: number; to: number } | null } } };
    const word = editorWithCM.cm.state.wordAt(pos);
    if (!word) return null;

    return {
      from: editor.offsetToPos(word.from),
      to: editor.offsetToPos(word.to),
    };
  } catch {
    return null;
  }
}

export function getSelectedText(editor: Editor): string {
  if (editor.somethingSelected()) {
    return editor.getSelection();
  }

  const wordBoundaries = getWordBoundaries(editor);
  if (!wordBoundaries) return "";

  editor.setSelection(wordBoundaries.from, wordBoundaries.to);
  return editor.getSelection();
}

export function adjustCursor(
  editor: Editor,
  cursor: EditorPosition,
  newStr: string,
  oldStr: string
): void {
  const cursorOffset = newStr.length - oldStr.length;
  editor.setCursor({
    line: cursor.line,
    ch: cursor.ch + cursorOffset,
  });
}

export function getFormattedDate(date: Date, format: string): string {
  return window.moment(date).format(format);
}

export function getLastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function parseTruthy(flag: string): boolean {
  return ["y", "yes", "1", "t", "true"].indexOf(flag.toLowerCase()) >= 0;
}

export function getWeekNumber(dayOfWeek: Omit<DayOfWeek, "locale-default">): number {
  return daysOfWeek.indexOf(dayOfWeek);
}

export function getLocaleWeekStart(): Omit<DayOfWeek, "locale-default"> {
  // Use cached locale data to avoid repeated expensive calls
  const localeData = getCachedLocaleData();
  const startOfWeek = localeData._week?.dow ?? 0; // Default to Sunday if not available
  return daysOfWeek[startOfWeek];
}

function escapeMdLinkText(text: string): string {
  return text.replace(/[[\]]/g, "\\$&");
}

function escapeMdLinkUrl(url: string): string {
  return url.replace(/ /g, "%20").replace(/[()]/g, "\\$&");
}

export function generateMarkdownLink(app: App, subpath: string, alias?: string) {
  const vaultWithConfig = app.vault as typeof app.vault & {
    getConfig: (key: string) => boolean;
  };
  const useMarkdownLinks = vaultWithConfig.getConfig("useMarkdownLinks");
  const path = normalizePath(subpath);

  if (useMarkdownLinks) {
    if (alias) {
      return `[${escapeMdLinkText(alias)}](${escapeMdLinkUrl(path)})`;
    } else {
      return `[${escapeMdLinkText(subpath)}](${escapeMdLinkUrl(path)})`;
    }
  } else {
    if (alias) {
      return `[[${path}|${alias}]]`;
    } else {
      return `[[${path}]]`;
    }
  }
}

export async function getOrCreateDailyNote(date: Moment): Promise<TFile | null> {
  // Borrowed from the Slated plugin:
  // https://github.com/tgrosinger/slated-obsidian/blob/main/src/vault.ts#L17
  const desiredNote = getDailyNote(date, getAllDailyNotes());
  if (desiredNote) {
    return Promise.resolve(desiredNote);
  }
  return createDailyNote(date);
}

// Source `chrono`:
// https://github.com/wanasit/chrono/blob/47f11da6b656cd5cb61f246e8cca706983208ded/src/utils/pattern.ts#L8
// Copyright (c) 2014, Wanasit Tanakitrungruang
type DictionaryLike = string[] | { [word: string]: unknown } | Map<string, unknown>;

function extractTerms(dictionary: DictionaryLike): string[] {
  let keys: string[];
  if (dictionary instanceof Array) {
    keys = [...dictionary];
  } else if (dictionary instanceof Map) {
    keys = Array.from((dictionary as Map<string, unknown>).keys());
  } else {
    keys = Object.keys(dictionary);
  }

  return keys;
}
function matchAnyPattern(dictionary: DictionaryLike): string {
  const joinedTerms = extractTerms(dictionary)
    .sort((a, b) => b.length - a.length)
    .join("|")
    .replace(/\./g, "\\.");

  return `(?:${joinedTerms})`;
}

const ORDINAL_WORD_DICTIONARY: { [word: string]: number } = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
  eleventh: 11,
  twelfth: 12,
  thirteenth: 13,
  fourteenth: 14,
  fifteenth: 15,
  sixteenth: 16,
  seventeenth: 17,
  eighteenth: 18,
  nineteenth: 19,
  twentieth: 20,
  "twenty first": 21,
  "twenty-first": 21,
  "twenty second": 22,
  "twenty-second": 22,
  "twenty third": 23,
  "twenty-third": 23,
  "twenty fourth": 24,
  "twenty-fourth": 24,
  "twenty fifth": 25,
  "twenty-fifth": 25,
  "twenty sixth": 26,
  "twenty-sixth": 26,
  "twenty seventh": 27,
  "twenty-seventh": 27,
  "twenty eighth": 28,
  "twenty-eighth": 28,
  "twenty ninth": 29,
  "twenty-ninth": 29,
  thirtieth: 30,
  "thirty first": 31,
  "thirty-first": 31,
};

export const ORDINAL_NUMBER_PATTERN = `(?:${matchAnyPattern(
  ORDINAL_WORD_DICTIONARY
)}|[0-9]{1,2}(?:st|nd|rd|th)?)`;

export function parseOrdinalNumberPattern(match: string): number {
  let num = match.toLowerCase();
  if (ORDINAL_WORD_DICTIONARY[num] !== undefined) {
    return ORDINAL_WORD_DICTIONARY[num];
  }

  num = num.replace(/(?:st|nd|rd|th)$/i, "");
  return parseInt(num);
}
