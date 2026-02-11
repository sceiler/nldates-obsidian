import { MarkdownView, Notice, ObsidianProtocolData, Plugin } from "obsidian";

import { LRUCache } from "./cache";
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

export default class NaturalLanguageDates extends Plugin {
  private parser: NLDParser;
  public settings: NLDSettings;
  private parseCache = new LRUCache<NLDResult>();

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
    this.parseCache.clear();
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  parse(dateString: string, format: string): NLDResult {
    // Include today's date in cache key so entries don't survive across midnight
    const today = new Date().toDateString();
    const cacheKey = `${dateString}:${format}:${this.settings.weekStart}:${today}`;

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

    this.parseCache.set(cacheKey, result);
    return result;
  }

  parseDate(dateString: string): NLDResult {
    return this.parse(dateString, this.settings.format);
  }

  parseTime(dateString: string): NLDResult {
    return this.parse(dateString, this.settings.timeFormat);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.parseCache.clear();
  }

  async actionHandler(params: ObsidianProtocolData): Promise<void> {
    const { workspace } = this.app;

    const dayParam = params.day;
    if (!dayParam || dayParam.length > 200) {
      new Notice("Invalid date provided to nldates.");
      return;
    }

    try {
      const date = this.parseDate(dayParam);
      const newPane = parseTruthy(params.newPane || "yes");

      if (date.moment.isValid()) {
        const dailyNote = await getOrCreateDailyNote(date.moment);
        if (dailyNote) {
          workspace.getLeaf(newPane).openFile(dailyNote);
        } else {
          new Notice("Failed to create daily note for: " + dayParam);
        }
      } else {
        new Notice("Could not parse date: " + dayParam);
      }
    } catch (error) {
      console.error("Error in nldates URI handler:", error);
      new Notice("Failed to open daily note. Please check the date format.");
    }
  }
}
