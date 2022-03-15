import {Editor} from "./Editor.js";

/** @type {Editor?} */
let editorInstance = null;

/**
 * Initializes the editor. This should only be called once by whatever created
 * the application. This sets a lot of things in motion, and therefore this
 * shouldn't be called from unit tests.
 */
export function initEditor() {
	editorInstance = new Editor();
	editorInstance.init();
}

/**
 * Gets the editor instance. This should be used sparingly, as it difficult to
 * deal with in unit tests. You should always use dependency injection where
 * possible. This will throw if {@linkcode initEditor} hasn't been called yet.
 * So you shouldn't use this in code that runs from the `Editor` constructor.
 * If you do wish to use this, make sure to mock the editor instance using
 * {@linkcode injectMockEditorInstance} in unit tests.
 */
export function getEditorInstance() {
	if (!editorInstance) throw new Error("Editor instance not initialized.");
	return editorInstance;
}

/**
 * Use this for unit tests to mock the editor instance.
 * @param {Editor} editor
 */
export function injectMockEditorInstance(editor) {
	editorInstance = editor;
}
