import "./styles/documentStyles.js";
import {getProjectSelectorInstance, initProjectSelector} from "./projectSelector/projectSelectorInstance.js";
export {};

initProjectSelector();
const projectSelector = getProjectSelectorInstance();
globalThis["projectSelector"] = projectSelector;
/** @type {typeof import("../../src/util/mod.js")?} */
globalThis["Util"] = null;
/** @type {import("./Studio.js").Studio?} */
globalThis["studio"] = null;
/** @type {import("./util/e2e/mod.js")?} */
globalThis["e2e"] = null;

(async () => {
	// We'll assign some modules to the global scope so that they can be used in the browser console.
	// This allows for using `Util.generateUuid()` for instance.
	const module = await import("../../src/util/mod.js");
	globalThis["Util"] = module;
	// todo: add more modules here? Math types etc. could be useful.
})();

(async () => {
	const module = await import("./studioInstance.js");
	module.initStudio();
	const studio = module.getStudioInstance();
	globalThis["studio"] = studio;
	if (studio) {
		projectSelector.setStudioLoaded(studio);
	}
})();

(async () => {
	const module = await import("./util/e2e/mod.js");
	globalThis["e2e"] = module;
})();
