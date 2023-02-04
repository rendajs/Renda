import {autoRegisterPropertiesWindowContent} from "./autoRegisterPropertiesWindowContent.js";
import {PropertiesWindowContent} from "./PropertiesWindowContent.js";
import {ContentWindowProperties} from "../windowManagement/contentWindows/ContentWindowProperties.js";
import {PropertiesWindowContentEmpty} from "./PropertiesWindowContentEmpty.js";
import {PropertiesWindowContentMultiple} from "./PropertiesWindowContentMultiple.js";

export class PropertiesWindowContentManager {
	/**
	 * @param {import("../windowManagement/WindowManager.js").WindowManager} windowManager
	 */
	constructor(windowManager) {
		this.windowManager = windowManager;
		/** @type {Map<new (...args: any) => any, typeof PropertiesWindowContent>} */
		this.registeredContentTypes = new Map();
	}

	init() {
		for (const t of autoRegisterPropertiesWindowContent) {
			this.registerPropertiesWindowContent(t);
		}
	}

	/**
	 * @param {typeof PropertiesWindowContent} constructor
	 */
	registerPropertiesWindowContent(constructor) {
		if (!(constructor.prototype instanceof PropertiesWindowContent)) {
			console.warn("Tried to register properties content type (" + constructor.name + ") that does not extend PropertiesWindowContent class.");
			return;
		}
		if (!constructor.useForTypes) {
			console.warn("Tried to register properties content type (" + constructor.name + ") with no useForTypes value, override the static useForTypes value in order for this content type to function properly");
			return;
		}
		const useForTypes = constructor.useForTypes;
		if (!(useForTypes instanceof Array)) {
			console.warn(constructor.name + " didn't register because its useForTypes value is not an array");
			return;
		}
		if (useForTypes.length == 0) {
			console.warn(constructor.name + " didn't register because its useForTypes array is empty");
			return;
		}

		for (const t of useForTypes) {
			this.registeredContentTypes.set(t, constructor);
		}

		// todo: make this a callback that properties window register
		for (const w of this.windowManager.getContentWindowsByConstructor(ContentWindowProperties)) {
			w.onContentTypeRegistered();
		}
	}

	/**
	 * @param {any[]} objects
	 * @returns {typeof PropertiesWindowContent}
	 */
	getContentTypeForObjects(objects) {
		/** @type {Map<typeof PropertiesWindowContent, number>} */
		const selectedTypes = new Map();
		for (const obj of objects) {
			if (!obj) continue;
			const t = this.registeredContentTypes.get(obj.constructor);
			if (!t) continue;
			let count = selectedTypes.get(t) || 0;
			count++;
			selectedTypes.set(t, count);
		}
		if (selectedTypes.size == 0) {
			return PropertiesWindowContentEmpty;
		} else if (selectedTypes.size == 1) {
			const onlyType = selectedTypes.keys().next().value;
			return onlyType;
		} else {
			return PropertiesWindowContentMultiple;
		}
	}
}
