# Version Changelog

For all individual changes, see the [Commit History](https://github.com/GlacialDrift/live-regex-replace/commits/master).

## Version 0.2.1

- Added support for multiple RegEx "pairs" in the settings
- Each RegEx "pair" consists of a RegEx pattern to be matched and the text it will be replaced with
- While typing, all RegEx pairs are checked (sequentially on each editor update)
- Added "New Pair" button in the settings and delete buttons for each existing pair
- Added clarity on how to use RegEx Pair fields
- Added CSS styling for RegEx Pair fields, `styles.css` is now a required file

## Version 0.2.0

- Added new setting and toggle for whether the global RegEx flag must be included in all searches
- Rearranged settings order in the settings tab
- Updated registerEvent logic so the `Live Editor Updates` toggle functions
- Updated settings tab with additional headers and descriptions
- Updated source document organization.
