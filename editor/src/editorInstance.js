import {Editor} from "./Editor.js";

/** @type {Editor} */
let editorInstance = null;

export function initEditor() {
	editorInstance = new Editor();
	editorInstance.init();
}

export function getEditorInstance() {
	return editorInstance;
}
