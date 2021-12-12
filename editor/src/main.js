import {getProjectSelectorInstance, initProjectSelector} from "./ProjectSelector/projectSelectorInstance.js";
export {};

initProjectSelector();
const projectSelector = getProjectSelectorInstance();
globalThis["projectSelector"] = projectSelector;

(async () => {
	const module = await import("./Util/Util.js");
	window["Util"] = module;
})();

(async () => {
	const module = await import("./editorInstance.js");
	module.initEditor();
	const editor = module.getEditorInstance();
	globalThis["editor"] = editor;
	projectSelector.setEditorLoaded(editor);
})();

