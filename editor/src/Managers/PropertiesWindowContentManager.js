import {autoRegisterContentWindows} from "../PropertiesWindowContent/autoRegisterContentWindows.js";
import {PropertiesWindowContent} from "../PropertiesWindowContent/PropertiesWindowContent.js";
import {ContentWindowProperties} from "../WindowManagement/ContentWindows/ContentWindowProperties.js";
import {PropertiesWindowEmptyContent} from "../PropertiesWindowContent/PropertiesWindowEmptyContent.js";
import {PropertiesWindowMultipleContent} from "../PropertiesWindowContent/PropertiesWindowMultipleContent.js";
import editor from "../editorInstance.js";

export class PropertiesWindowContentManager {
	constructor() {
		this.registeredContentTypes = new Map();
	}

	init() {
		for (const t of autoRegisterContentWindows) {
			this.registerContentType(t);
		}
	}

	registerContentType(constructor) {
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
		for (const w of editor.windowManager.getContentWindowsByConstructor(ContentWindowProperties)) {
			w.onContentTypeRegistered(constructor);
		}
	}

	getContentTypeForObjects(objects) {
		const selectedTypes = new Map();
		for (const obj of objects) {
			if (!obj) continue;
			const t = this.registeredContentTypes.get(obj.constructor);
			if (!t) continue;
			let count = 0;
			if (selectedTypes.has(t)) {
				count = selectedTypes.get(t);
			}
			count++;
			selectedTypes.set(t, count);
		}
		if (selectedTypes.size == 0) {
			return PropertiesWindowEmptyContent;
		} else if (selectedTypes.size == 1) {
			const onlyType = selectedTypes.keys().next().value;
			return onlyType;
		} else {
			return PropertiesWindowMultipleContent;
		}
	}
}
