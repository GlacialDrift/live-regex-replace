import LiveRegexReplace from "./main";
import {App, PluginSettingTab, Setting} from "obsidian";

export interface RegexPattern {
	regexFind: string;
	regexReplace: string;
}

export interface RegexReplaceSettings {
	enableLiveUpdate: boolean;
	flags: string;
	advancedToggle: boolean;
	requireGlobalFlag: boolean;
	regex_patterns: Array<RegexPattern>;
}

export const DEFAULT_SETTINGS: RegexReplaceSettings = {
	enableLiveUpdate: true,
	flags: "g",
	advancedToggle: false,
	requireGlobalFlag: true,
	regex_patterns: [{regexFind: "(?<!\\[)WC:(\\d{8})(?!]\\()", regexReplace: "[WC:$1](https://plm.bsci.bossci.com/Windchill/netmarkets/jsp/bsci/plm/object/searchLatestEffObject.jsp?objNumber=$1)"}]
};

export class RegexReplaceSettingsTab extends PluginSettingTab {
	plugin: LiveRegexReplace;

	constructor(app: App, plugin: LiveRegexReplace) {
		super(app, plugin);
		this.plugin = plugin;
	}

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
			.setDesc("Reset below values to default settings")
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
	addRegexFields(): void {
		const desc = document.createDocumentFragment();
		desc.append(
			"The first column below represents the regular expression patterns that will be matched. The second",
			" column below represents the replacement text.",
			desc.createEl("br"),
			desc.createEl("br"),
			"The regular expression can include capture groups (e.g. ",
			desc.createEl("code", {text: "(\\d{8})"}),
			"). The replacement text can use those capture groups (e.g. ",
			desc.createEl("code", {text: "[$1](...)"}),
			"). Use these fields carefully, as an empty ",
			desc.createEl("code", {text: "replacement text"}),
			" field will delete any text matched."
		);

		new Setting(this.containerEl)
			.setName("Regular Expression Fields")
			.setDesc(desc)
			.setHeading();

		this.plugin.settings.regex_patterns.forEach(
			(regexPattern, index) =>{
				const s = new Setting(this.containerEl)
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
								this.plugin.compileRegex();
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
							regexFind: "",
							regexReplace: "",
						});
						await this.plugin.saveSettings();
						this.plugin.compileRegex();
						this.display();
					});
			});

		/*
		new Setting(this.containerEl)
			.setName("Match Pattern (Regular Expression)")
			.setDesc("Regular Expression pattern to find. No slashes. Capture groups allowed (e.g. (\\d{8}).")
			.addText((t) => {
				t.setValue(this.plugin.settings.regexPattern)
					.onChange(async (v) => {
						this.plugin.settings.regexPattern = v;
						await this.plugin.saveSettings();
						this.plugin.compileRegex();
					})
			});


		new Setting(this.containerEl)
			.setName("Replacement Text")
			.setDesc("Enter the text that will replace the matched pattern. Use $1, $2, $3... for matched groups and $& for the whole match.")
			.addText((t) => {
				t.setValue(this.plugin.settings.replacement)
					.onChange(async (v) => {
						this.plugin.settings.replacement = v;
						await this.plugin.saveSettings();
					})
			});

		 */
	}

	addFlagFields(): void {
		const desc = document.createDocumentFragment();
		desc.append(
			"The settings below allow for modification of the Regular Expression flag rules. If you do not",
			" recognize 'regular expression flags', you can safely leave these alone and text replacement will work as expected.",
			desc.createEl("br"),
			desc.createEl("br"),
			"By default, the global flag is applied to all regular expressions. This can be modified with the setting below."
		);

		new Setting(this.containerEl)
			.setName("Regular Expression Flag Fields")
			.setDesc(desc)
			.setHeading();

		new Setting(this.containerEl)
			.setName("Regular Expression Flags")
			.setDesc("Valid: g i m s u y")
			.addText( (t) => {
				t.setValue(this.plugin.settings.flags)
					.onChange(async (v) => {
						this.plugin.settings.flags = v.replace(/[^gimsuy]/g, "");
						await this.plugin.saveSettings();
						this.plugin.compileRegex();
					})
			});

		new Setting(this.containerEl)
			.setName("Require global RegEx flag")
			.setDesc("Toggle to always ensure the global RegEx flag (g) is included in the list of flags")
			.addToggle( (toggle) => {
				toggle.setValue(this.plugin.settings.requireGlobalFlag)
					.onChange(async (v) => {
						this.plugin.settings.requireGlobalFlag = v;
						await this.plugin.saveSettings();
						this.plugin.compileRegex();
						this.display();
					})
			});
	}
}
