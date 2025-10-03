import {App, Notice, Plugin, PluginSettingTab, Setting} from 'obsidian';

// Remember to rename these classes and interfaces!

interface WindchillPluginSettings {
	enableLiveUpdate: boolean;
	regexPattern: string;
	flags: string;
	replacement: string;
	advancedToggle: boolean;
}

const DEFAULT_SETTINGS: WindchillPluginSettings = {
	enableLiveUpdate: true,
	regexPattern: "(?<!\\[)WC:(\\d{8})(?!]\\()",
	flags: "g",
	advancedToggle: false,
	replacement: "[WC:$1](https://plm.bsci.bossci.com/Windchill/netmarkets/jsp/bsci/plm/object/searchLatestEffObject.jsp?objNumber=$1)"
};

export default class WindchillLinker extends Plugin {
	settings!: WindchillPluginSettings;
	private compiledRe: RegExp | null = null;
	private isUpdating = false;

	async onload() {
		console.log("WindchillLinker plugin loaded");

		await this.loadSettings();
		this.addSettingTab(new SettingTab(this.app, this));
		this.compileRegex();

		/*
		this.registerMarkdownPostProcessor((el) => {
			const links = el.querySelectorAll('a.external-link');
			Array.from(links).forEach((link) => {
				if (link.getAttribute("href")?.startsWith("https://plm.bsci.bossci.com")) {
					link.classList.add("windchill-link");
				}
			});
		});
		 */

		/*
		this.addCommand({
			id: "convert-all-wc-links",
			name: "Convert WC:######## links in all notes",
			callback: async () => {
				const files = this.app.vault.getMarkdownFiles();
				const linkRegex = /(?<!\[)WC:(\d{8})(?!\]\()/g;

				for (const file of files) {
					let content = await this.app.vault.read(file);
					if (this.settings.excludeCodeAndYaml) {
						content = this.convertExcludingBlocks(content, linkRegex);
					} else {
						content = content.replace(linkRegex, (match, num) =>
							`[WC:${num}](https://plm.bsci.bossci.com/Windchill/netmarkets/jsp/bsci/plm/object/searchLatestEffObject.jsp?objNumber=${num})`
						);
					}
					await this.app.vault.modify(file, content);
				}
				new Notice("Windchill links converted in all notes.");
			}
		});
		 */

		this.registerEvent(
			this.app.workspace.on("editor-change", (editor) => {
				if (!editor || this.isUpdating || !this.compiledRe) return;

				const re = this.compiledRe;
				const cursor = editor.getCursor();
				const text = editor.getLine(cursor.line);

				// Use string replacement so $1, $& work from user input
				const updated = text.replace(re, this.settings.replacement);

				if (updated !== text) {
					this.isUpdating = true;
					editor.setLine(cursor.line, updated);
					this.isUpdating = false;
				}
			})
		);
	}

	/*
	convertExcludingBlocks(content: string, regex: RegExp): string {
		const blocks: { start: number; end: number }[] = [];

		// Find YAML frontmatter
		const yamlMatch = /^---\n([\s\S]*?)\n---/.exec(content);
		if (yamlMatch) {
			blocks.push({ start: 0, end: yamlMatch[0].length });
		}

		// Find code blocks
		const codeBlockRegex = /```[\s\S]*?```/g;
		let codeMatch;
		while ((codeMatch = codeBlockRegex.exec(content)) !== null) {
			blocks.push({ start: codeMatch.index, end: codeMatch.index + codeMatch[0].length });
		}

		// Find inline code
		const inlineCodeRegex = /`[^`]*`/g;
		let inlineMatch;
		while ((inlineMatch = inlineCodeRegex.exec(content)) !== null) {
			blocks.push({ start: inlineMatch.index, end: inlineMatch.index + inlineMatch[0].length });
		}

		// Replace only outside blocks
		return content.replace(regex, (match, num, offset) => {
			if (blocks.some(block => offset >= block.start && offset < block.end)) {
				return match;
			}
			return `[WC:${num}](https://plm.bsci.bossci.com/Windchill/netmarkets/jsp/bsci/plm/object/searchLatestEffObject.jsp?objNumber=${num})`;
		});
	}
	 */

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	compileRegex() {
		// Always include 'g'; allow i/m/u/s/y as user chooses
		const cleanedFlags = [...new Set((this.settings.flags || "").split(""))]
			.filter((f) => "gimsuy".includes(f))
			.join("");
		const flags = cleanedFlags.includes("g") ? cleanedFlags : cleanedFlags + "g";

		try {
			this.compiledRe = new RegExp(this.settings.regexPattern, flags);
		} catch (e) {
			this.compiledRe = null;
			new Notice(`Invalid RegExp: ${(e as Error).message}`);
		}
	}
}

class SettingTab extends PluginSettingTab {
	plugin: WindchillLinker;

	constructor(app: App, plugin: WindchillLinker) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl("h3", { text: "Windchill Linker Settings" });

		new Setting(containerEl)
			.setName("Live editor updates")
			.setDesc("Automatically convert WC:######## as you type")
			.addToggle(toggle =>
				toggle.setValue(this.plugin.settings.enableLiveUpdate)
					.onChange(async (value) => {
						this.plugin.settings.enableLiveUpdate = value;
						await this.plugin.saveSettings();
					}));

		new Setting(containerEl)
			.setName("Show Advanced Settings")
			.addToggle(toggle =>{
				toggle.setValue(this.plugin.settings.advancedToggle)
					.onChange(async (value) => {
						this.plugin.settings.advancedToggle = value;
						await this.plugin.saveSettings();
						this.display();
					})
			});

		if(this.plugin.settings.advancedToggle){
			containerEl.createEl("h3", {text: "Regular Expression Settings. DO NOT CHANGE without knowing Regular Expressions"});

			new Setting(containerEl)
				.setName("Reset Regular Expressions")
				.setDesc("Reset below values to default settings")
				.addButton( (but) =>{
					but
						.setButtonText("Reset")
						.onClick( async () =>{
							this.plugin.settings = {... DEFAULT_SETTINGS};
							await this.plugin.saveSettings();
							this.plugin.compileRegex();
							this.plugin.settings.advancedToggle = true;
							this.display();
						})
				});

			new Setting(containerEl)
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

			new Setting(containerEl)
				.setName("Regular Expression Flags")
				.setDesc("Valid: g i m s u y (g is always enforced)")
				.addText( (t) => {
					t.setValue(this.plugin.settings.flags)
						.onChange(async (v) => {
							this.plugin.settings.flags = v.replace(/[^gimsuy]/g, "");
							await this.plugin.saveSettings();
							this.plugin.compileRegex();
						})
				});

			new Setting(containerEl)
				.setName("Replacement Text")
				.setDesc("Enter the text that will replace the matched pattern. Use $1, $2, $3... for matched groups and $& for the whole match.")
				.addText( (t) => {
					t.setValue(this.plugin.settings.replacement)
						.onChange(async (v) => {
							this.plugin.settings.replacement = v;
							await this.plugin.saveSettings();
						})
				});
		}
	}
}
