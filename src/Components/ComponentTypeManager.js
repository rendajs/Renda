import {isUuid} from "../mod.js";
import {Component} from "./mod.js";

export class ComponentTypeManager {
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
		const uuid = constructor.uuid;
		if (!uuid || !isUuid(uuid)) {
			console.warn("Tried to register Component (" + constructor.name + ") without a valid uuid value, override the static uuid value in order for this loader to function properly.");
			return;
		}

		this.components.set(uuid, constructor);
	}

	/**
	 * @param {import("../mod.js").UuidString} uuid
	 * @returns {typeof Component?}
	 */
	getComponentConstructorForUuid(uuid) {
		return this.components.get(uuid) ?? null;
	}

	*getAllComponents() {
		for (const component of this.components.values()) {
			yield component;
		}
	}
}
