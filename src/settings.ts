import LiveRegexReplace from "./main";
import {App, PluginSettingTab, Setting} from "obsidian";

/**
 * Single find/replace rule.
 *
 * @remarks
 * Each entry is rendered as a row of three text inputs in the Settings tab:
 * 1) human-readable description, 2) find pattern (RegExp source), 3) replacement text.
 *
 * `regexFind` should be a valid JavaScript regular expression **source** (without slashes).
 * Flags are applied globally via plugin settings.
 */
export interface RegexPattern {

	/** Human-readable name/description for the rule. */
	regexDesc: string;

	/** Regular expression **source** used to match (no leading/trailing `/`). */
	regexFind: string;

	/**
	 * Replacement string used with `String.prototype.replace`.
	 *
	 * @remarks
	 * Capture groups from {@link regexFind} can be referenced as `$1`, `$2`, etc.
	 * Remember that `$&` inserts the whole match, `$`` the prefix, and `$'` the suffix.
	 */
	regexReplace: string;
}


/**
 * Persisted user settings for LiveRegexReplace.
 */
export interface RegexReplaceSettings {

	/**
	 * When true, perform live, line-scoped replacements during typing.
	 * When false, disables the editor-change handler.
	 */
	enableLiveUpdate: boolean;

	/**
	 * String of regex flags applied to every compiled pattern (e.g. `"gim"`).
	 * Only `g i m s u y` are recognized; others are ignored at compile time.
	 */
	flags: string;

	/**
	 * Reveals advanced settings (regex list and flags UI) in the Settings tab.
	 * Toggled at runtime and persisted.
	 */
	advancedToggle: boolean;

	/**
	 * If enabled, enforces the `g` (global) flag for all compiled patterns,
	 * adding it if missing from {@link flags}.
	 */
	requireGlobalFlag: boolean;

	/**
	 * Ordered list of configured find/replace rules.
	 *
	 * @remarks
	 * The index of each entry aligns with the compiled regex array in the main plugin.
	 * Reordering or deleting entries will affect which replacement string is applied.
	 */
	regex_patterns: Array<RegexPattern>;
}

/**
 * Default settings applied on first load or when fields are missing.
 *
 * @remarks
 * Ships with a single rule that converts `WC:########` into a Windchill hyperlink.
 * The default requires a non-bracketed `WC:` token (negative lookbehind) and
 * avoids matching already-linkified text (negative lookahead).
 */
export const DEFAULT_SETTINGS: RegexReplaceSettings = {
	enableLiveUpdate: true,
	flags: "g",
	advancedToggle: false,
	requireGlobalFlag: true,
	regex_patterns: [{
		regexDesc: "Windchill Hyperlinker",
		regexFind: "(?<!\\[)WC:(\\d{8})(?!]\\()",
		regexReplace: "[WC:$1](https://plm.bsci.bossci.com/Windchill/netmarkets/jsp/bsci/plm/object/searchLatestEffObject.jsp?objNumber=$1)"
	}]
};

/**
 * Settings UI for LiveRegexReplace.
 *
 * @remarks
 * Renders a compact “main” toggle by default. When {@link RegexReplaceSettings.advancedToggle} is enabled,
 * it exposes:
 * - Reset button to restore {@link DEFAULT_SETTINGS}
 * - Regex rule editor (3 text inputs per rule + delete/add)
 * - Flag controls (`requireGlobalFlag`, raw `flags` string)
 *
 * Methods are split for readability; each one renders a section or control cluster.
 *
 * @public
 */
export class RegexReplaceSettingsTab extends PluginSettingTab {

	/** Owning plugin instance (used to read/write settings and recompile patterns). */
	plugin: LiveRegexReplace;

	/**
	 * Constructs the settings tab bound to the given plugin instance.
	 */
	constructor(app: App, plugin: LiveRegexReplace) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Primary render method called by Obsidian.
	 *
	 * @remarks
	 * Clears the container, renders the main toggle and advanced toggle.
	 * If advanced mode is enabled, renders reset, regex fields, and flag fields.
	 *
	 * @sideEffects
	 * Mutates the DOM within {@link containerEl}.
	 */
	display(): void {
		this.containerEl.empty();

		this.addMainToggle();
		this.addAdvancedSettingsToggle();
		if(this.plugin.settings.advancedToggle) {
			this.addResetButton();
			this.addRegexFields();
			this.addFlagFields();
		}
	}

	/**
	 * Renders the master on/off switch for live updates.
	 *
	 * @remarks
	 * Persists {@link RegexReplaceSettings.enableLiveUpdate} immediately on change.
	 */
	addMainToggle(): void {
		new Setting(this.containerEl)
			.setName("Live editor updates")
			.setDesc("Automatically convert matched pattern (e.g. WC:########) with replacement text (e.g. hyperlink) as you type.")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.enableLiveUpdate)
					.onChange(async (value) => {
						this.plugin.settings.enableLiveUpdate = value;
						await this.plugin.saveSettings();
					});
			});
	}

	/**
	 * Renders the “Show advanced Settings” toggle.
	 *
	 * @remarks
	 * Toggling re-renders the entire tab to show/hide advanced sections.
	 */
	addAdvancedSettingsToggle(): void {
		new Setting(this.containerEl)
			.setName("Show advanced Settings")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.advancedToggle)
					.onChange(async (value) => {
						this.plugin.settings.advancedToggle = value;
						await this.plugin.saveSettings();
						this.display();
					})
			});
	}

	/**
	 * Renders the advanced section header and a “Reset Regular Expressions” CTA.
	 *
	 * @remarks
	 * Clicking **Reset**:
	 * - replaces the entire settings object with {@link DEFAULT_SETTINGS},
	 * - saves settings,
	 * - recompiles regex patterns,
	 * - forces advanced mode on,
	 * - re-renders the tab.
	 *
	 * @warning
	 * This **deletes any custom regex pairs** the user has configured.
	 */
	addResetButton(): void {
		const desc = document.createDocumentFragment();
		desc.append(
			"Advanced settings for regular expression live updates.",
			desc.createEl("br"),
			desc.createEl("br"),
			"The default settings assume that the user desires ",
			desc.createEl("code", {text: "WC:########"}),
			" to be replaced with a hyperlink to that Windchill file. It is recommended that no changes are made to",
			" the regular expression fields without knowledge of regular expressions."
		);

		new Setting(this.containerEl)
			.setName("Advanced Regular Expression Settings")
			.setHeading()
			.setDesc(desc);

		new Setting(this.containerEl)
			.setName("Reset Regular Expressions")
			.setDesc("Reset below values to default settings. WARNING: THIS WILL DELETE ANY CUSTOM REGEX PAIRS")
			.addButton((but) => {
				but
					.setButtonText("Reset")
					.setTooltip("Reset Regular Expressions to Default Settings")
					.setCta()
					.onClick(async () => {
						this.plugin.settings = {...DEFAULT_SETTINGS};
						await this.plugin.saveSettings();
						this.plugin.compileRegex();
						this.plugin.settings.advancedToggle = true;
						this.display();
					})
			});
	}

	/**
	 * Renders the editable list of regex rules (description, find, replace).
	 *
	 * @remarks
	 * - Each text input persists on change.
	 * - Editing `regexFind` triggers a recompilation.
	 * - The delete “cross” removes a rule, persists, recompiles, and re-renders.
	 * - “Add new RegEx Pair” appends a blank rule, persists, recompiles, and re-renders.
	 *
	 * @ui
	 * The description above the list explains the three-field layout and highlights
	 * pitfalls like nested linkification when patterns lack proper boundaries.
	 */
	addRegexFields(): void {
		const desc = document.createDocumentFragment();

		const ol = desc.createEl("ol");
		ol.createEl("li", {text: "The first text field is used for custom naming and descriptions. It can be" +
				" difficult to remember the purpose of a regular expression replacement after some time. This field" +
				" allows you to describe what this RegEx replacement is intended to do."
		});
		ol.createEl("li", {text: "The second text field is used for the match-finding regular expression. This" +
				" can be any valid regular expression (using JavaScripts regular expression engine)."
		});
		ol.createEl("li", {text: "The third text field is used for the replacement text after the regular" +
				" expression has been matched. This replacement text can utilize capture groups from the" +
				" corresponding regular expression (e.g. $1 and $2 for the first and second capture groups)."
		});

		desc.append(
			"Below are the fields used to define regular expression patterns, the text to replace them with,",
			" and a custom description of the regular expression purpose.",
			ol,
			"Take care in designing the regular expressions and replacements. For example, using a regular expression ",
			desc.createEl("code", {text: "WC:(\\d{8})"}),
			" and replacement ",
			desc.createEl("code", {text: "[WC:$1](hyperlink)"}),
			" will continually replace the ",
			desc.createEl("code", {text: "WC:\\d{8}"}),
			" text with nested hyperlinks. It is therefore highly recommended that well-defined start/end tokens are ",
			" used, or that look-ahead and look-behinds are used."
		);

		new Setting(this.containerEl)
			.setName("Regular Expression Fields")
			.setDesc(desc)
			.setHeading();

		this.plugin.settings.regex_patterns.forEach(
			(regexPattern, index) =>{
				const s = new Setting(this.containerEl)
					.addText((t) =>{
						t.setValue(regexPattern.regexDesc)
							.onChange(async (value) => {
								this.plugin.settings.regex_patterns[index].regexDesc = value;
								await this.plugin.saveSettings();
							});
						t.inputEl.classList.add("regex_field");
					})
					.addText((t) => {
						t.setValue(regexPattern.regexFind)
							.onChange(async (value) => {
								this.plugin.settings.regex_patterns[index].regexFind = value;
								await this.plugin.saveSettings();
								this.plugin.compileRegex();
							});
						t.inputEl.classList.add("regex_field");
					})
					.addText((t) => {
						t.setValue(regexPattern.regexReplace)
							.onChange(async (value) => {
								this.plugin.settings.regex_patterns[index].regexReplace = value;
								await this.plugin.saveSettings();
							});
						t.inputEl.classList.add("regex_field");
					})
					.addExtraButton((cb) => {
						cb.setIcon("cross")
							.setTooltip("Delete")
							.onClick(async () => {
								this.plugin.settings.regex_patterns.splice(
									index,
									1
								);
								await this.plugin.saveSettings();
								this.plugin.compileRegex();
								this.display();
							});
					})
				s.infoEl.remove();
			}
		);

		new Setting(this.containerEl)
			.addButton((but) => {
				but.setButtonText("Add new RegEx Pair")
					.setTooltip("Add additional RegEx Pair")
					.setCta()
					.onClick(async () => {
						this.plugin.settings.regex_patterns.push({
							regexDesc: "RegEx Description",
							regexFind: "",
							regexReplace: "",
						});
						await this.plugin.saveSettings();
						this.plugin.compileRegex();
						this.display();
					});
			});
	}

	/**
	 * Renders controls for regex flags and the “require global flag” toggle.
	 *
	 * @remarks
	 * - Recompiles patterns on any change.
	 * - The free-text flags input is sanitized to `g i m s u y` only.
	 */
	addFlagFields(): void {
		const desc = document.createDocumentFragment();
		desc.append(
			"The settings below allow for modification of the Regular Expression flag rules. If you do not",
			" recognize 'regular expression flags', you can leave these alone and text replacement will work as expected.",
			desc.createEl("br"),
			desc.createEl("br"),
			"By default, the global flag is applied to all regular expressions. This can be modified with the setting below."
		);

		new Setting(this.containerEl)
			.setName("Regular Expression Flag Fields")
			.setDesc(desc)
			.setHeading();

		new Setting(this.containerEl)
			.setName("Require global RegEx flag")
			.setDesc("When the toggle is on, forces the global flag, g, for all compiled regular expressions.")
			.addToggle( (toggle) => {
				toggle.setValue(this.plugin.settings.requireGlobalFlag)
					.onChange(async (v) => {
						this.plugin.settings.requireGlobalFlag = v;
						await this.plugin.saveSettings();
						this.plugin.compileRegex();
						this.display();
					})
			});

		new Setting(this.containerEl)
			.setName("Regular Expression Flags")
			.setDesc("Valid regular expression flags include: g i m s u y")
			.addText( (t) => {
				t.setValue(this.plugin.settings.flags)
					.onChange(async (v) => {
						this.plugin.settings.flags = v.replace(/[^gimsuy]/g, "");
						await this.plugin.saveSettings();
						this.plugin.compileRegex();
					})
			});
	}
}
