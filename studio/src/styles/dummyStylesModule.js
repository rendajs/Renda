/**
 * @fileoverview Deno doesn't support importing css files and will cause errors in unit tests.
 * Since unit tests don't need styles, we've added entries to the deno import map so that it
 * imports this file instead of files containing css import assertions.
 */

export const contentWindowHistorySheet = {};
