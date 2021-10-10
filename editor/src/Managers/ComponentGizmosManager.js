import autoRegisterComponentGizmos from "../ComponentGizmos/AutoRegisterComponentGizmos.js";
import ComponentGizmos from "../ComponentGizmos/ComponentGizmos.js";

export default class ComponentGizmosManager {
	constructor() {
		this.componentGizmos = new Map(); // Map<componentType, ComponentGizmos>
	}

	init() {
		for (const componentGizmos of autoRegisterComponentGizmos) {
			this.registerComponentGizmos(componentGizmos);
		}
	}

	registerComponentGizmos(constructor) {
		if (!(constructor.prototype instanceof ComponentGizmos)) {
			console.warn("Tried to register ComponentGizmos (" + constructor.name + ") that does not extend ComponentGizmos class.");
			return;
		}

		if (constructor.componentType == null) {
			constructor.invalidConfigurationWarning("Failed to register ComponentGizmos (" + constructor.name + ") componentType value not set.");
			return;
		}

		this.componentGizmos.set(constructor.componentType, constructor);
	}

	getComponentGizmos(componentType) {
		return this.componentGizmos.get(componentType);
	}

	createComponentGizmosInstance(componentType, component, gizmoManager) {
		const constructor = this.getComponentGizmos(componentType);
		if (!constructor) return null;
		return new constructor(component, gizmoManager);
	}
}
