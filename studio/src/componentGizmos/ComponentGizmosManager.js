import { getStudioInstance } from "../studioInstance.js";
import { autoRegisterComponentGizmos } from "./autoRegisterComponentGizmos.js";
import { ComponentGizmos } from "./gizmos/ComponentGizmos.js";

export class ComponentGizmosManager {
	/** @typedef {import("../../../src/components/Component.js").ComponentConstructor} ComponentConstructor */

	constructor() {
		/** @type {Map<ComponentConstructor, typeof ComponentGizmos>} */
		this.componentGizmos = new Map();
	}

	init() {
		for (const componentGizmos of autoRegisterComponentGizmos) {
			this.registerComponentGizmos(componentGizmos);
		}
	}

	/**
	 * @param {import("./gizmos/ComponentGizmos.js").ComponentGizmosConstructorAny} constructor
	 */
	registerComponentGizmos(constructor) {
		const castConstructor = /** @type {typeof ComponentGizmos} */ (constructor);
		if (!(constructor.prototype instanceof ComponentGizmos)) {
			throw new Error(`Tried to register ComponentGizmos (${constructor.name}) that does not extend ComponentGizmos class.`);
		}

		if (castConstructor.componentType == null) {
			throw new Error(`Failed to register ComponentGizmos (${constructor.name}) componentType value not set.`);
		}

		this.componentGizmos.set(castConstructor.componentType, castConstructor);
	}

	/**
	 * @param {ComponentConstructor} componentType
	 */
	getComponentGizmosConstructor(componentType) {
		return this.componentGizmos.get(componentType);
	}

	/**
	 * @param {ComponentConstructor} componentType
	 * @param {import("../../../src/components/Component.js").Component} component
	 * @param {import("../../../src/gizmos/GizmoManager.js").GizmoManager} gizmoManager
	 */
	createComponentGizmosInstance(componentType, component, gizmoManager) {
		const ComponentGizmosConstructor = this.getComponentGizmosConstructor(componentType);
		if (!ComponentGizmosConstructor) return null;
		const studio = getStudioInstance();
		return new ComponentGizmosConstructor(studio, component, gizmoManager);
	}
}
