import LiveRegexReplace from "./main";
import {App, PluginSettingTab, Setting} from "obsidian";

export interface RegexPattern {
	regexDesc: string;
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
	regex_patterns: [{regexDesc: "Windchill Hyperlinker", regexFind: "(?<!\\[)WC:(\\d{8})(?!]\\()", regexReplace: "[WC:$1](https://plm.bsci.bossci.com/Windchill/netmarkets/jsp/bsci/plm/object/searchLatestEffObject.jsp?objNumber=$1)"}]
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
	addRegexFields(): void {
		const desc = document.createDocumentFragment();

		const ol = desc.createEl("ol");
		ol.createEl("li", {text: "The first text field is used for custom naming and descriptions. It can be" +
				" difficult to remember the purpose of a regular expression replacement. This field allows you to" +
				" describe what this RegEx replacement is intended to do."
		});
		ol.createEl("li", {text: "The second text field is used for the match-finding regular expression. This" +
				" can be any valid regular expression (using JavaScripts regular expression engine)."
		});
		ol.createEl("li", {text: "The third text field is used for the replacement text after the regular" +
				" expression has been matched. This replacement text can utilize capture groups from the" +
				" corresponding regular expression."
		});
		desc.append(
			"Below are the fields used to define regular expression patterns, the text to replace them with,",
			" and a custom description of the regular expression purpose.",
			ol,
			"Care must be taken in designing the regular expressions and replacements. For example, using a regular expression ",
			desc.createEl("code", {text: "WC:(\\d{8})"}),
			" and replacement ",
			desc.createEl("code", {text: "[WC:$1](hyperlink)"}),
			" will continually replace the ",
			desc.createEl("code", {text: "WC:\\d{8}"}),
			" text with nested hyperlinks. It is therefore highly recommended that well-defined start/end tokens are ",
			" used or look-ahead and look-behinds are used."
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
