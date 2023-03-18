/**
 * @fileoverview Deno doesn't support importing css files and will cause errors in unit tests.
 * Since unit tests don't need styles, we've added an entry to the deno import map so that it
 * imports this file instead of shadowStyles.js
 */

export const contentWindowHistorySheet = {};
