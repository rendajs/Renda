/**
 * @fileoverview Utility for initializing the editor.
 * When importing certain files from the editor, errors can occur when this
 * causes files with circular references to be loaded in a certain order.
 *
 * Import this file before any other files from the editor.
 */

import "../../../../editor/src/editorInstance.js";
