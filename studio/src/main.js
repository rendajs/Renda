import "./styles/projectSelectorStyles.js";
import {getProjectSelectorInstance, initProjectSelector} from "./projectSelector/projectSelectorInstance.js";
export {};

initProjectSelector();
const projectSelector = getProjectSelectorInstance();
globalThis["projectSelector"] = projectSelector;

// We'll assign some modules to the global scope so that they can be used in the browser console.
// This allow you to use `Util.generateUuid()` or `new Renda.Vec3()` for instance.
// We could have imported the whole engine here, but that kind of defeats the purpose of tree shaking.
// For the majority of cases, just these modules should be enough.
(async () => {
	const mod = await import("../../src/util/mod.js");
	// @ts-ignore
	globalThis["Util"] = mod;
})();
(async () => {
	/** @type {Object<string, any>} */
	const globalRenda = {};
	// @ts-ignore
	globalThis["Renda"] = globalRenda;
	const promises = [
		import("../../src/math/mod.js"),
		import("../../src/core/mod.js"),
	];
	promises.forEach(async promise => {
		const mod = await promise;
		for (const [key, value] of Object.entries(mod)) {
			globalRenda[key] = value;
		}
	});
})();

/** @type {import("./Studio.js").Studio?} */
globalThis["studio"] = null;
(async () => {
	const module = await import("./studioInstance.js");
	module.initStudio();
	const studio = module.getStudioInstance();
	globalThis["studio"] = studio;
	if (studio) {
		projectSelector.setStudioLoaded(studio);
	}
})();

/** @type {import("./util/e2e/mod.js")?} */
globalThis["e2e"] = null;
(async () => {
	const module = await import("./util/e2e/mod.js");
	globalThis["e2e"] = module;
})();
