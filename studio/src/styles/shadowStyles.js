/**
 * @fileoverview
 * These style sheets are not appended to the global `document.adoptedStyleSheets` array, but instead are
 * imported across different files to be used in a shadow tree.
 */

// @ts-nocheck

import contentWindowHistorySheet from "../windowManagement/contentWindows/ContentWindowHistory.css" assert {type: "css"};
export {contentWindowHistorySheet};

import contentWindowEntityEditorSheet from "../windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.css" assert {type: "css"};
export {contentWindowEntityEditorSheet};
