import {ProjectSelector} from "./ProjectSelector.js";

/** @type {ProjectSelector?} */
let projectSelectorInstance = null;

export function initProjectSelector() {
	projectSelectorInstance = new ProjectSelector();
}

export function getProjectSelectorInstance() {
	if (!projectSelectorInstance) throw new Error("ProjectSelector not initialized.");
	return projectSelectorInstance;
}
