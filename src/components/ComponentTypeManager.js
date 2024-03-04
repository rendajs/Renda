import { isUuid } from "../util/util.js";
import { Component } from "./Component.js";

export class ComponentTypeManager {
	constructor() {
		/** @type {Map<import("../util/util.js").UuidString, typeof Component>} */
		this.components = new Map();
	}

	/**
	 * @param {import("./Component.js").ComponentConstructor} constructor
	 */
	registerComponent(constructor) {
		if (!(constructor.prototype instanceof Component)) {
			console.warn("Tried to register Component (" + constructor.name + ") that does not extend the Component class.");
			return;
		}
		const castConstructor = /** @type {typeof Component} */ (constructor);
		const uuid = castConstructor.uuid;
		if (!uuid || !isUuid(uuid)) {
			console.warn("Tried to register Component (" + constructor.name + ") without a valid uuid value, override the static uuid value in order for this loader to function properly.");
			return;
		}

		this.components.set(uuid, castConstructor);
	}

	/**
	 * @param {import("../util/util.js").UuidString} uuid
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
