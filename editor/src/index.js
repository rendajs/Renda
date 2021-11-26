import {projectSelector} from "./ProjectSelector/instance.js";
export default {};

(async () => {
	const module = await import("./editorInstance.js");
	window["editor"] = module.default;
	projectSelector.setEditorLoaded(module.default);
})();

