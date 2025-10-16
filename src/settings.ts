import LiveRegexReplace from "./main";
import {App, PluginSettingTab, Setting} from "obsidian";

export interface RegexReplaceSettings {
	enableLiveUpdate: boolean;
	regexPattern: string;
	flags: string;
	replacement: string;
	advancedToggle: boolean;
	requireGlobalFlag: boolean;
}

export const DEFAULT_SETTINGS: RegexReplaceSettings = {
	enableLiveUpdate: true,
	regexPattern: "(?<!\\[)WC:(\\d{8})(?!]\\()",
	flags: "g",
	advancedToggle: false,
	replacement: "[WC:$1](https://plm.bsci.bossci.com/Windchill/netmarkets/jsp/bsci/plm/object/searchLatestEffObject.jsp?objNumber=$1)",
	requireGlobalFlag: true
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
		if(this.plugin.settings.advancedToggle){
			new Setting(this.containerEl).setName("Advanced Regular Expression Settings.").setHeading();

			new Setting(this.containerEl)
				.setName("Reset Regular Expressions")
				.setDesc("Reset below values to default settings")
				.addButton( (but) =>{
					but
						.setButtonText("Reset")
						.setTooltip("Reset Regular Expressions to Default Settings")
						.setCta()
						.onClick( async () =>{
							this.plugin.settings = {... DEFAULT_SETTINGS};
							await this.plugin.saveSettings();
							this.plugin.compileRegex();
							this.plugin.settings.advancedToggle = true;
							this.display();
						})
				});

			new Setting(this.containerEl)
				.setName("Match Pattern (Regular Expression)")
				.setDesc("Regular Expression pattern to find. No slashes. Capture groups allowed (e.g. (\\d{8}).")
				.addText( (t) => {
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
				.addText( (t) => {
					t.setValue(this.plugin.settings.replacement)
						.onChange(async (v) => {
							this.plugin.settings.replacement = v;
							await this.plugin.saveSettings();
						})
				});

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
}
