/**
 * @fileoverview This file only exports editor globals as mock objects. The
 * exported objects are all empty, but they have the correct type set.
 * This way, you can use puppeteers `page.evaluate` function without generating
 * any type errors.
 */

export const editor = /** @type {import("../../../../editor/src/Editor.js").Editor} */ ({});

export const document = /** @type {Document} */ ({});
