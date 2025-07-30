import { MarkdownView, ObsidianProtocolData, Plugin } from "obsidian";

import {
    getCurrentDateCommand,
    getCurrentTimeCommand,
    getNowCommand,
    getParseCommand,
} from "./commands";
import DatePickerModal from "./modals/date-picker";
import NLDParser, { NLDResult } from "./parser";
import { DEFAULT_SETTINGS, NLDSettings, NLDSettingsTab } from "./settings";
import DateSuggest from "./suggest/date-suggest";
import { getFormattedDate, getOrCreateDailyNote, parseTruthy } from "./utils";

// Simple LRU cache for parsed results
class ParseCache {
  private cache = new Map<string, { result: NLDResult; timestamp: number }>();
  private maxSize = 100;
  private maxAge = 5 * 60 * 1000; // 5 minutes

  get(key: string): NLDResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.result;
  }

  set(key: string, result: NLDResult): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, { result, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

export default class NaturalLanguageDates extends Plugin {
  private parser: NLDParser;
  public settings: NLDSettings;
  private parseCache = new ParseCache();

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addCommand({
      id: "nlp-dates",
      name: "Parse natural language date",
      callback: () => getParseCommand(this, "replace"),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-dates-link",
      name: "Parse natural language date (as link)",
      callback: () => getParseCommand(this, "link"),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-date-clean",
      name: "Parse natural language date (as plain text)",
      callback: () => getParseCommand(this, "clean"),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-parse-time",
      name: "Parse natural language time",
      callback: () => getParseCommand(this, "time"),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-now",
      name: "Insert the current date and time",
      callback: () => getNowCommand(this),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-today",
      name: "Insert the current date",
      callback: () => getCurrentDateCommand(this),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-time",
      name: "Insert the current time",
      callback: () => getCurrentTimeCommand(this),
      hotkeys: [],
    });

    this.addCommand({
      id: "nlp-picker",
      name: "Date picker",
      checkCallback: (checking: boolean) => {
        if (checking) {
          return !!this.app.workspace.getActiveViewOfType(MarkdownView);
        }
        new DatePickerModal(this.app, this).open();
      },
      hotkeys: [],
    });

    this.addSettingTab(new NLDSettingsTab(this.app, this));
    this.registerObsidianProtocolHandler("nldates", this.actionHandler.bind(this));
    this.registerEditorSuggest(new DateSuggest(this.app, this));

    this.app.workspace.onLayoutReady(() => {
      // initialize the parser when layout is ready so that the correct locale is used
      this.parser = new NLDParser();
    });
  }

  onunload(): void {
    console.log("Unloading natural language date parser plugin");
    // Clean up caches
    this.parseCache.clear();
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  /*
    @param dateString: A string that contains a date in natural language, e.g. today, tomorrow, next week
    @param format: A string that contains the formatting string for a Moment
    @returns NLDResult: An object containing the date, a cloned Moment and the formatted string.
  */
  parse(dateString: string, format: string): NLDResult {
    const cacheKey = `${dateString}:${format}:${this.settings.weekStart}`;
    
    // Check cache first
    const cached = this.parseCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const date = this.parser.getParsedDate(dateString, this.settings.weekStart);
    const formattedString = getFormattedDate(date, format);
    if (formattedString === "Invalid date") {
      console.debug("Input date " + dateString + " can't be parsed by nldates");
    }

    const result = {
      formattedString,
      date,
      moment: window.moment(date),
    };

    // Cache the result
    this.parseCache.set(cacheKey, result);
    return result;
  }

  /*
    @param dateString: A string that contains a date in natural language, e.g. today, tomorrow, next week
    @returns NLDResult: An object containing the date, a cloned Moment and the formatted string.
  */
  parseDate(dateString: string): NLDResult {
    return this.parse(dateString, this.settings.format);
  }

  parseTime(dateString: string): NLDResult {
    return this.parse(dateString, this.settings.timeFormat);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    // Clear cache when settings change as they affect parsing results
    this.parseCache.clear();
  }

  async actionHandler(params: ObsidianProtocolData): Promise<void> {
    const { workspace } = this.app;

    try {
      const date = this.parseDate(params.day);
      const newPane = parseTruthy(params.newPane || "yes");

      if (date.moment.isValid()) {
        const dailyNote = await getOrCreateDailyNote(date.moment);
        if (dailyNote) {
          workspace.getLeaf(newPane).openFile(dailyNote);
        } else {
          console.warn("Failed to create or get daily note for date:", params.day);
        }
      } else {
        console.warn("Invalid date provided to nldates URI handler:", params.day);
      }
    } catch (error) {
      console.error("Error in nldates URI handler:", error);
      // Optionally show user-friendly error message
      // new Notice("Failed to open daily note. Please check the date format.");
    }
  }
}
