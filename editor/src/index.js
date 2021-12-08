import {projectSelector} from "./ProjectSelector/instance.js";
export {};

globalThis["projectSelector"] = projectSelector;

(async () => {
	const module = await import("./editorInstance.js");
	globalThis["editor"] = module.default;
	projectSelector.setEditorLoaded(module.default);
})();

