import {
    App,
    Editor,
    EditorPosition,
    EditorSuggest,
    EditorSuggestContext,
    EditorSuggestTriggerInfo,
    TFile,
} from "obsidian";
import type NaturalLanguageDates from "src/main";
import { generateMarkdownLink } from "src/utils";

interface IDateCompletion {
  label: string;
}

export default class DateSuggest extends EditorSuggest<IDateCompletion> {
  app: App;
  private plugin: NaturalLanguageDates;
  private parseCache = new Map<string, string>();
  private debounceTimer: NodeJS.Timeout | null = null;
  private lastQuery = "";

  constructor(app: App, plugin: NaturalLanguageDates) {
    super(app);
    this.app = app;
    this.plugin = plugin;

    // Register Shift+Enter to keep text as alias
    // Note: Accessing internal Obsidian API properties
    try {
      const scope = this.scope as any;
      scope.register(["Shift"], "Enter", (evt: KeyboardEvent) => {
        const suggestions = (this as any).suggestions;
        if (suggestions && suggestions.useSelectedItem) {
          suggestions.useSelectedItem(evt);
        }
        return false;
      });
    } catch (error) {
      console.warn("Failed to register Shift+Enter shortcut for date suggestions:", error);
    }

    if (this.plugin.settings.autosuggestToggleLink) {
      this.setInstructions([{ command: "Shift", purpose: "Keep text as alias" }]);
    }
  }

  // Clean up resources when component is destroyed
  onunload(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.parseCache.clear();
  }

  // Debounced parsing to avoid excessive computation during typing
  private debouncedParse(query: string, callback: (result: string) => void): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Check cache first - immediate response for cached items
    const cached = this.parseCache.get(query);
    if (cached) {
      callback(cached);
      return;
    }

    // For very short queries, use shorter debounce
    const debounceDelay = query.length <= 2 ? 50 : 100; // Reduced from 150ms

    this.debounceTimer = setTimeout(() => {
      try {
        const result = this.plugin.parseDate(query).formattedString;
        this.parseCache.set(query, result);
        
        // Limit cache size
        if (this.parseCache.size > 50) {
          const firstKey = this.parseCache.keys().next().value;
          this.parseCache.delete(firstKey);
        }
        
        callback(result);
      } catch (error) {
        console.warn("Date parsing error:", error);
        callback(query);
      }
    }, debounceDelay);
  }

  getSuggestions(context: EditorSuggestContext): IDateCompletion[] {
    const suggestions = this.getDateSuggestions(context);
    if (suggestions.length) {
      return suggestions;
    }

    // catch-all if there are no matches
    return [{ label: context.query }];
  }

  getDateSuggestions(context: EditorSuggestContext): IDateCompletion[] {
    if (context.query.match(/^time/)) {
      return ["now", "+15 minutes", "+1 hour", "-15 minutes", "-1 hour"]
        .map((val) => ({ label: `time:${val}` }))
        .filter((item) => item.label.toLowerCase().startsWith(context.query));
    }
    if (context.query.match(/(next|last|this)/i)) {
      const reference = context.query.match(/(next|last|this)/i)[1];
      return [
        "week",
        "month",
        "year",
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ]
        .map((val) => ({ label: `${reference} ${val}` }))
        .filter((items) => items.label.toLowerCase().startsWith(context.query));
    }

    const relativeDate =
      context.query.match(/^in ([+-]?\d+)/i) || context.query.match(/^([+-]?\d+)/i);
    if (relativeDate) {
      const timeDelta = relativeDate[1];
      return [
        { label: `in ${timeDelta} minutes` },
        { label: `in ${timeDelta} hours` },
        { label: `in ${timeDelta} days` },
        { label: `in ${timeDelta} weeks` },
        { label: `in ${timeDelta} months` },
        { label: `${timeDelta} days ago` },
        { label: `${timeDelta} weeks ago` },
        { label: `${timeDelta} months ago` },
      ].filter((items) => items.label.toLowerCase().startsWith(context.query));
    }

    return [{ label: "Today" }, { label: "Yesterday" }, { label: "Tomorrow" }].filter(
      (items) => items.label.toLowerCase().startsWith(context.query)
    );
  }

  renderSuggestion(suggestion: IDateCompletion, el: HTMLElement): void {
    el.setText(suggestion.label);
  }

  selectSuggestion(suggestion: IDateCompletion, event: KeyboardEvent | MouseEvent): void {
    const { editor } = this.context;

    const includeAlias = event.shiftKey;
    let dateStr = "";
    let makeIntoLink = this.plugin.settings.autosuggestToggleLink;

    if (suggestion.label.startsWith("time:")) {
      const timePart = suggestion.label.substring(5);
      // Use cached result if available
      const cached = this.parseCache.get(timePart);
      if (cached) {
        dateStr = cached;
      } else {
        dateStr = this.plugin.parseTime(timePart).formattedString;
        this.parseCache.set(timePart, dateStr);
      }
      makeIntoLink = false;
    } else {
      // Use cached result if available
      const cached = this.parseCache.get(suggestion.label);
      if (cached) {
        dateStr = cached;
      } else {
        dateStr = this.plugin.parseDate(suggestion.label).formattedString;
        this.parseCache.set(suggestion.label, dateStr);
      }
    }

    if (makeIntoLink) {
      dateStr = generateMarkdownLink(
        this.app,
        dateStr,
        includeAlias ? suggestion.label : undefined
      );
    }

    editor.replaceRange(dateStr, this.context.start, this.context.end);
  }

  onTrigger(
    cursor: EditorPosition,
    editor: Editor,
    _file: TFile
  ): EditorSuggestTriggerInfo {
    if (!this.plugin.settings.isAutosuggestEnabled) {
      return null;
    }

    const triggerPhrase = this.plugin.settings.autocompleteTriggerPhrase;
    const startPos = this.context?.start || {
      line: cursor.line,
      ch: cursor.ch - triggerPhrase.length,
    };

    if (!editor.getRange(startPos, cursor).startsWith(triggerPhrase)) {
      return null;
    }

    const precedingChar = editor.getRange(
      {
        line: startPos.line,
        ch: startPos.ch - 1,
      },
      startPos
    );

    // Short-circuit if `@` as a part of a word (e.g. part of an email address)
    if (precedingChar && /[`a-zA-Z0-9]/.test(precedingChar)) {
      return null;
    }

    return {
      start: startPos,
      end: cursor,
      query: editor.getRange(startPos, cursor).substring(triggerPhrase.length),
    };
  }
}
