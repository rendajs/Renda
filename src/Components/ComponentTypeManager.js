import {isUuid} from "../mod.js";
import {Component} from "./mod.js";

export default class ComponentTypeManager {
	constructor() {
		/** @type {Map<import("../../editor/src/../../src/util/mod.js").UuidString, typeof Component>} */
		this.components = new Map();
	}

	/**
	 * @param {typeof Component} constructor
	 */
	registerComponent(constructor) {
		if (!(constructor.prototype instanceof Component)) {
			console.warn("Tried to register Component (" + constructor.name + ") that does not extend the Component class.");
			return;
		}
		if (!isUuid(constructor.uuid)) {
			console.warn("Tried to register Component (" + constructor.name + ") without a valid uuid value, override the static uuid value in order for this loader to function properly.");
			return;
		}

		this.components.set(constructor.uuid, constructor);
	}

	/**
	 * @param {import("../../editor/src/../../src/util/mod.js").UuidString} uuid
	 * @returns {typeof Component}
	 */
	getComponentConstructorForUuid(uuid) {
		return this.components.get(uuid);
	}

	*getAllComponents() {
		for (const component of this.components.values()) {
			yield component;
		}
	}
}
