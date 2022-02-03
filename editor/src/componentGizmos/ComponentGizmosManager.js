import {getEditorInstanceCertain} from "../editorInstance.js";
import {autoRegisterComponentGizmos} from "./autoRegisterComponentGizmos.js";
import {ComponentGizmos} from "./gizmos/ComponentGizmos.js";

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
			console.warn("Tried to register ComponentGizmos (" + constructor.name + ") that does not extend ComponentGizmos class.");
			return;
		}

		if (castConstructor.componentType == null) {
			castConstructor.invalidConfigurationWarning("Failed to register ComponentGizmos (" + constructor.name + ") componentType value not set.");
			return;
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
		const editor = getEditorInstanceCertain();
		return new ComponentGizmosConstructor(editor, component, gizmoManager);
	}
}
