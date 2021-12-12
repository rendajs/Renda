import {ProjectSelector} from "./ProjectSelector.js";

/** @type {ProjectSelector} */
let projectSelectorInstance = null;

export function initProjectSelector() {
	projectSelectorInstance = new ProjectSelector();
}

export function getProjectSelectorInstance() {
	return projectSelectorInstance;
}
