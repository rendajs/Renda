import {Application} from "./Application.js";

/** @type {Application?} */
let mainInstance = null;

export function init() {
	mainInstance = new Application();
	mainInstance.init();
}

export function getMainInstance() {
	if (!mainInstance) throw new Error("Main instance not initialized.");
	return mainInstance;
}
