import {Editor} from "./Editor.js";

/** @type {Editor?} */
let editorInstance = null;

export function initEditor() {
	editorInstance = new Editor();
	editorInstance.init();
}

export function getEditorInstance() {
	return editorInstance;
}

// todo: Eventually only getEditorInstanceCertain() should be used and renamed
// to getEditorInstance(). But because TS throws an error when
// getEditorInstance() is used without checking if it is null, it is quite
// convenient to find all places where it is being used.
// We want to use `getEditorInstance()` as little as possible
// and move to dependency injection. So we won't rename this until all
// places where it is used are revised.
export function getEditorInstanceCertain() {
	if (!editorInstance) throw new Error("Editor instance not initialized.");
	return editorInstance;
}
