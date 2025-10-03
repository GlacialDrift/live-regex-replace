---
Author: Mike Harris
Version: 0.1.0
Github: https://github.com/GlacialDrift/windchill-linker/tree/master
---

# Live Regex Replace

This plugin is an active listener in your Obsidian Vault. It looks for any patterns matching the Regular Expression pattern defined in the plugin settings. If found, the text in your vault is replaced with the replacement text specified in the plugin settings. Optionally, the replacement text can contain contents of the matched text using regular expression matching.

This plugin was originally developed to replace `WC:########` with a hyperlink to Windchill webpages for personal use. The plugin was then expanded to be of use to all Boston Scientific employees that use Windchill for ease of note-taking. The plugin was then modified to provide users with customizable regular expression patterns and replacements. 

## License

Please read the LICENSE file included in this github repository. Currently, this plugin is licensed under the MIT License.

## Functionality

When text matching a regular expression is found, it is automatically replaced by the replacement text specified in settings. This happens automatically while typing in Obsidian Live Preview mode.

**By default**, this plugin ships with Windchill document replacement. When an 8-digit number is preceded by "WC:", it is replaced with a hyperlink to the active version of the document with the corresponding 8-digit number.

Care must be taken in designing the regular expressions and replacements. For example, using a regular expression `WC:(d{8})` and replacement `[WC:$1](hyperlink)` will continually replace the text field of the hyperlink with additional nested hyperlinks as the text field remains unchanged. Therefore, it is recommended that lookbehinds and lookaheads are used to prevent cascading replacement.

Currently, the plugin only actively searches the line actively being edited. Therefore, to update existing text with a hyperlink, simply click on the line containing the text and update the line. 

## Settings

More information about regular expressions is available online. The plugin uses the `replace` function to replace pattern-matched text. Therefore, `replace` -compatible fields are required. My go-to cheat sheet is the [Quick-Start: Regex Cheat Sheet](https://www.rexegg.com/regex-quickstart.php).

#### Regular Expression Pattern

This is the regular expression used to pattern match text within your Obsidian vault. The default setting uses the following regular expression:
	`(?<!\[)WC:(\d{8})(?!]\()`

#### Regular Expression Flags

Optional regular expression flags to be included with the pattern when compiling the regular expression pattern. Currently, the global flag is always included regardless of user input, but other flags may be added.

#### Replacement Text

This is the text that will be used to replace the pattern-matched text in the note. This can be a simple string, but it may also include matches from the regular expression match. Use `$1`, `$2`, ... to match groups from the regular expression and `$&` to match the entire pattern. The plugin ships with a hyperlink replacement that links to Windchill documents.

## RoadMap

This plugin was written originally for personal use and expanded to offer generalized functionality. Therefore, while this roadmap lays out some possible future changes, no future updates are guaranteed.

| Date Added  | Possible Feature                                                                                                                                                                        |
|:-----------:|:----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 2025-10-03  | Add a markdown post-processor to include CSS classes in replaced text for optional CSS formatting                                                                                       |
| 2025-10-03  | Add command to search the entire vault and automatically perform replacement on any matching text found in any file                                                                     |
| 2025-10-03  | Add exclusion functionality so that text found within code blocks (or YAML frontmatter) is excluded from replacement                                                                    |
| 2025-10-03  | Add optional setting to disable automatic global insertion for RegEx flags                                                                                                              |
| 2025-10-03  | Add ability to have multiple pattern-replacement pairs specified in the settings                                                                                                        |
| 2025-10-03  | Add search functionality for the entire active document instead of the current active line of the note                                                                                  |
| 2025-10-03  | Add Save-Settings and Load-Settings feature that saves the current settings to JSON file and allows loading of other settings JSON files (useful for experimenting with Regex Patterns) |
