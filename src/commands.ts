import { MarkdownView, Notice } from "obsidian";
import type NaturalLanguageDates from "./main";
import { adjustCursor, getSelectedText } from "./utils";

export function getParseCommand(plugin: NaturalLanguageDates, mode: string): void {
  const { workspace } = plugin.app;
  const activeView = workspace.getActiveViewOfType(MarkdownView);

  // The active view might not be a markdown view
  if (!activeView) {
    return;
  }

  try {
    const editor = activeView.editor;
    const cursor = editor.getCursor();
    const selectedText = getSelectedText(editor);

    if (!selectedText || selectedText.trim().length === 0) {
      // No text selected or empty text
      return;
    }

    const date = plugin.parseDate(selectedText);

    if (!date.moment.isValid()) {
      new Notice("Could not parse date: " + selectedText);
      editor.setCursor({
        line: cursor.line,
        ch: cursor.ch,
      });
      return;
    }

    //mode == "replace"
    let newStr = `[[${date.formattedString}]]`;

    if (mode == "link") {
      newStr = `[${selectedText}](${date.formattedString})`;
    } else if (mode == "clean") {
      newStr = `${date.formattedString}`;
    } else if (mode == "time") {
      const time = plugin.parseTime(selectedText);
      if (!time.moment.isValid()) {
        return; // Invalid time, do nothing
      }
      newStr = `${time.formattedString}`;
    }

    editor.replaceSelection(newStr);
    adjustCursor(editor, cursor, newStr, selectedText);
    editor.focus();
  } catch (error) {
    console.error("Error in parse command:", error);
    // Fail silently to avoid disrupting user workflow
  }
}

export function insertMomentCommand(
  plugin: NaturalLanguageDates,
  date: Date,
  format: string
) {
  const { workspace } = plugin.app;
  const activeView = workspace.getActiveViewOfType(MarkdownView);

  if (activeView) {
    // The active view might not be a markdown view
    const editor = activeView.editor;
    editor.replaceSelection(window.moment(date).format(format));
  }
}

export function getNowCommand(plugin: NaturalLanguageDates): void {
  const format = `${plugin.settings.format}${plugin.settings.separator}${plugin.settings.timeFormat}`;
  const date = new Date();
  insertMomentCommand(plugin, date, format);
}

export function getCurrentDateCommand(plugin: NaturalLanguageDates): void {
  const format = plugin.settings.format;
  const date = new Date();
  insertMomentCommand(plugin, date, format);
}

export function getCurrentTimeCommand(plugin: NaturalLanguageDates): void {
  const format = plugin.settings.timeFormat;
  const date = new Date();
  insertMomentCommand(plugin, date, format);
}
