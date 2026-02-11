// Minimal mock of the obsidian module for testing
export class App {}
export class Editor {}
export class MarkdownView {}
export class Modal {
  app: App;
  contentEl = { createEl: () => ({}) };
  constructor(app: App) {
    this.app = app;
  }
  open() {}
  close() {}
}
export class Notice {
  constructor(_message: string) {}
}
export class Plugin {
  app: App;
  loadData() { return Promise.resolve({}); }
  saveData(_data: unknown) { return Promise.resolve(); }
  addCommand() {}
  addSettingTab() {}
  registerObsidianProtocolHandler() {}
  registerEditorSuggest() {}
}
export class PluginSettingTab {}
export class Setting {
  setName() { return this; }
  setDesc() { return this; }
  addText() { return this; }
  addToggle() { return this; }
  addDropdown() { return this; }
  addMomentFormat() { return this; }
}
export class TFile {}

export class EditorSuggest {
  scope = {};
  context = { start: { line: 0, ch: 0 }, end: { line: 0, ch: 0 } };
  setInstructions() {}
}

export function normalizePath(path: string) {
  return path;
}
