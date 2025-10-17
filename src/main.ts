import {Notice, Plugin,} from 'obsidian';
import {RegexReplaceSettings, RegexReplaceSettingsTab, DEFAULT_SETTINGS} from "./settings";

export default class LiveRegexReplace extends Plugin {
	settings!: RegexReplaceSettings;
	private compiledRe: Array<RegExp> | null = null;
	private isUpdating = false;

	async onload() {

		await this.loadSettings();
		this.addSettingTab(new RegexReplaceSettingsTab(this.app, this));
		this.compileRegex();


		this.registerEvent(
			this.app.workspace.on("editor-change", (editor) => {
				if (!editor || this.isUpdating || !this.compiledRe || !this.settings.enableLiveUpdate) return;

				const re = this.compiledRe;
				const cursor = editor.getCursor();
				const text = editor.getLine(cursor.line);

				// Use string replacement so $1, $& work from user input
				re.forEach(
					(regexPattern, index) =>{
						const updated = text.replace(regexPattern, this.settings.regex_patterns[index].regexReplace)
						if (updated !== text) {
							this.isUpdating = true;
							editor.setLine(cursor.line, updated);
							this.isUpdating = false;
						}
					}
				);
			})
		);
	}

	onunload() {}

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
		const flags = (this.settings.requireGlobalFlag) ? (cleanedFlags.includes("g") ? cleanedFlags : cleanedFlags + "g") : cleanedFlags;

		try {
			if(this.settings.regex_patterns.length === 0){
				this.compiledRe = null;
			}else{
				this.compiledRe = new Array<RegExp>();
			}
			this.settings.regex_patterns.forEach(
				(regexPattern) => {
					this.compiledRe!.push(new RegExp(regexPattern.regexFind, flags));
				}
			);
		} catch (e) {
			this.compiledRe = null;
			new Notice(`Invalid RegExp: ${(e as Error).message}`);
		}
	}

	/* Removed Exclude Block compatibility. Wasn't working as intended. Needs fixing
	 * May re-visit in the future, but I don't expect/intend users to create hyperlinks
	 * in code blocks or yaml.
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

	/* Removed Markdown Post Processor. Only purpose was to color the hyperlinks differently
		 * May re-visit this in the future and add user-customizable hyperlink color.
		this.registerMarkdownPostProcessor((el) => {
			const links = el.querySelectorAll('a.external-link');
			Array.from(links).forEach((link) => {
				if (link.getAttribute("href")?.startsWith("https://plm.bsci.bossci.com")) {
					link.classList.add("windchill-link");
				}
			});
		});
		 */

	/* Removed command. Originally used during development testing
	 * May revisit in the future for user-initiated vault-wide link replacement
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


}
