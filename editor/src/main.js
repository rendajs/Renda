import "./styles/styles.js";
import {getProjectSelectorInstance, initProjectSelector} from "./projectSelector/projectSelectorInstance.js";
export {};

initProjectSelector();
const projectSelector = getProjectSelectorInstance();
globalThis["projectSelector"] = projectSelector;
/** @type {typeof import("../../src/util/mod.js")?} */
globalThis["Util"] = null;
/** @type {import("./Editor.js").Editor?} */
globalThis["editor"] = null;

(async () => {
	// We'll assign some modules to the global scope so that they can be used in the browser console.
	// This allows for using `Util.generateUuid()` for instance.
	const module = await import("../../src/util/mod.js");
	globalThis["Util"] = module;
	// todo: add more modules here? Math types etc. could be useful.
})();

(async () => {
	const module = await import("./editorInstance.js");
	module.initEditor();
	const editor = module.getEditorInstance();
	globalThis["editor"] = editor;
	if (editor) {
		projectSelector.setEditorLoaded(editor);
	}
})();

