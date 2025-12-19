---
Author: Mike Harris
Version: 0.2.2
Github: https://github.com/GlacialDrift/live-regex-replace
---

# Live Regex Replace

This plugin is an active listener in your Obsidian Vault. It looks for any patterns matching the Regular Expression 
pattern defined in the plugin settings. If found, the text in your vault is replaced with the replacement text specified 
in the plugin settings. Optionally, the replacement text can contain contents of the matched text using regular expression 
matching.

### Plugin History & Purpose 

This plugin was originally developed explicitly to replace `WC:########` with a hyperlink to Windchill webpages for 
personal use. The plugin was shared so that it could be of use to all Boston Scientific employees that use Windchill for ease 
of note-taking. The plugin was then modified to provide users with customizable regular expression patterns and replacements. 
Most recently, the ability to have multiple regular expression detection patterns has been added. 

## License

Please read the LICENSE file included in this github repository. Currently, this plugin is licensed under the MIT License.

## Functionality

When text matching a regular expression is found, it is automatically replaced by the replacement text specified in 
settings. This happens automatically while typing in Obsidian Live Preview mode.

**By default**, this plugin ships with Windchill document replacement. When an 8-digit number is preceded by "WC:", it 
is replaced with a hyperlink to the active version of the document with the corresponding 8-digit number.

Care must be taken in designing the regular expressions and replacements. For example, using a regular expression 
`WC:(d{8})` and replacement `[WC:$1](hyperlink)` will continually replace the text field of the hyperlink with additional 
nested hyperlinks as the text field remains unchanged. Therefore, it is recommended that look-behinds and look-aheads are 
used to prevent cascading replacement. Similarly, it is recommended that start and end tokens are clearly identified.

Currently, the plugin only searches the line actively being edited. Therefore, to update existing text with a 
hyperlink, simply click on the line containing the text and update the line. 

## Settings

More information about regular expressions is available online. The plugin uses the `replace` function to replace 
pattern-matched text. Therefore, `replace` -compatible fields are required. My go-to cheat sheet is the [Quick-Start: Regex Cheat Sheet](https://www.rexegg.com/regex-quickstart.php).

### RegEx "Pairs"

The plugin is designed to be used with user-defined RegEx Pairs. Each RegEx Pair consists of:
1. A user-defined name / description. This is useful for remembering what a RegEx replacement is intended to do.
2. A regular expression used to match text on the active line. This is what the plugin is looking to replace.
3. "Replacement Text". This is the text that will be used to replace any matched regular expressions. Note that because the plugin uses the `replace` function, matched groups can be utilized in the replacement text. 

### Regular Expression Pattern

This is the regular expression used to pattern match text within your Obsidian vault. The default setting uses the 
following regular expression: `(?<!\[)WC:(\d{8})(?!]\()`

### Replacement Text

This is the text that will be used to replace the pattern-matched text in the note. This can be a simple string, but 
it may also include matches from the regular expression match. Use `$1`, `$2`, ... to match groups from the regular 
expression and `$&` to match the entire pattern. The plugin ships with a hyperlink replacement that links to Windchill 
documents.

The default setting uses `[WC:$1](hyperlink)`, where hyperlink is a link to the corresponding Windchill document. 

Since version 0.2.2, this field is a TextArea Component that allows multiple input lines. 

### Regular Expression Flags

Optional regular expression flags to be included with the pattern when compiling the regular expression pattern.
The user has the option of setting the global flag to always be included.

## Examples

#### Replacement with Hyperlink

The original use-case for this plugin was to search for text in a note matching a particular pattern and replace that 
text with a hyperlink that includes some of the original text. Frequent reference to 8-digit document numbers led to 
referencing them as `WC:########`, where `WC` is the abbreviation for the document control system. The same document
control system allows for generation of hyperlinks that take you to the current active document by using something like
`hyperlink-########` (abbreviated for clarity). 

|   RegEx Pattern   | Replacement Text | Issues                                                                                                                                                                           |
|:-----------------:|:----------------:|:---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|   `WC:(\d{8})`    | `[WC:$1](hyperlink-$1)`| A successful hyperlink is created. However, updating the same line causes re-detection of the `WC:\d{8}` pattern. This creates nested hyperlinks every time the line is updated. |
| `WC:(\d{8})(?!])` | `[WC:$1](hyperlink-$1)` | Adding a negative look-ahead, `(?!])`, ensures that only patterns that **are not** followed by `]` are matched.                                                                  |
| `(?<!\[)WC:(\d{8})(?!]\()`| `[WC:$1](hyperlink-$1)` | Adding a negative look-behind, `(?<!\[)`, ensures that only patterns that **are not** preceeded by `[` are matched. The negative look-ahead is expanded, `(?!]\()`, to ensure that only patterns that **are not** followed by `](` are matched. |

#### In-line Data Fields

A common use case when using the [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin for Obsidian 
is to create in-line data fields that take the form `[Key:: Value]`. In personal use, writing the single brackets can 
be frustrating because of the muscle memory of using `[[]]` to create links to other files. The creation of an in-line 
data field can be assisted with RegEx replace. The goal is to write `Key:: Value (with Multiple Words?)` and turn the 
pair into an in-line data field. 

| RegEx Pattern | Replacement Text | Issues |
|:-------------:|:----------------:|:-------|
| `(\w+)::\s+(\w+)` | `[$1:: $2]` | This pattern finds the `Key` that preceeds a `::` and the first word of the `Value` after the `::`. Only one value word is detected. Updating the same line will still find the original match inside the `[ ]`, causing nested replacements.|
| `(?<!\[)(\w+)::\s+(\w+)(?!])` | `[$1:: $2]` | This pattern uses negative look-ahead and negative look-behind to ensure that only patterns without leading `[` and trailing `]` are detected. Still only detects one word after the `::`. |
|`(\b\w+::(?:\s+[^:]+)+)\s*:`| `[$1]` | This RegEx pattern successfully detects a `Key` preceeding a `::`. The non-capturing group `(?:\s+[^:]+)+` ensures that the `Value` can be multiple words. The overall capturing group ensures the entire `Key:: Value` pair is captured, and the ending `:` marks the endpoint of the `Value`.|

## Changelog

For the full changelog, see `CHANGELOG.md`

## RoadMap

This plugin was written originally for personal use and expanded to offer generalized functionality. Therefore, while 
this roadmap lays out some possible future changes, no future updates are guaranteed.

| Date Added  | Possible Feature                                                                                                                                                                        |
|:-----------:|:----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 2025-10-03  | Add a markdown post-processor to include CSS classes in replaced text for optional CSS formatting                                                                                       |
| 2025-10-03  | Add command to search the entire vault and automatically perform replacement on any matching text found in any file                                                                     |
| 2025-10-03  | Add exclusion functionality so that text found within code blocks (or YAML frontmatter) is excluded from replacement                                                                    |
| 2025-10-03  | Add search functionality for the entire active document instead of the current active line of the note                                                                                  |
| 2025-10-03  | Add Save-Settings and Load-Settings feature that saves the current settings to JSON file and allows loading of other settings JSON files (useful for experimenting with Regex Patterns) |
