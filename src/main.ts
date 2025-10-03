import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface WindchillPluginSettings {
	enableLiveUpdate: boolean;
	excludeCodeAndYaml: boolean;
}

const DEFAULT_SETTINGS: WindchillPluginSettings = {
	enableLiveUpdate: true,
	excludeCodeAndYaml: true,
};

export default class WindchillLinker extends Plugin {
	settings: WindchillPluginSettings;

	async onload() {
		console.log("WindchillLinker plugin loaded");

		await this.loadSettings();
		this.addSettingTab(new SettingTab(this.app, this));

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

		const WC_UNLINKED_REGEX = /(?<!\[)WC:(\d{8})(?!]\()/g;

		let isUpdating = false;

		this.registerEvent(
			this.app.workspace.on("editor-change", (editor) => {
				if (!editor || isUpdating) return;

				const cursor = editor.getCursor();
				const line = editor.getLine(cursor.line);

				const updatedLine = line.replace(WC_UNLINKED_REGEX, (match, num) => {
					return `[WC:${num}](https://plm.bsci.bossci.com/Windchill/netmarkets/jsp/bsci/plm/object/searchLatestEffObject.jsp?objNumber=${num})`;
				});

				if (updatedLine !== line) {
					isUpdating = true;
					editor.setLine(cursor.line, updatedLine);
					isUpdating = false;
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
		containerEl.createEl("h2", { text: "Windchill Linker Settings" });

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
			.setName("Exclude code blocks / YAML")
			.setDesc("Ignore WC references in YAML, fenced code, and inline code")
			.addToggle(toggle =>
				toggle.setValue(this.plugin.settings.excludeCodeAndYaml)
					.onChange(async (value) => {
						this.plugin.settings.excludeCodeAndYaml = value;
						await this.plugin.saveSettings();
					}));
	}
}
