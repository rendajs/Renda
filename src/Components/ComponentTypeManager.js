export default class ComponentTypeManager {
	constructor() {
		this.components = new Map(); // Map<uuid, componentData>
	}

	registerComponent(componentData) {
		if (!componentData) {
			console.warn("registerComponent expects componentData to be an object.");
			return null;
		}
		if (!componentData.uuid) {
			console.warn("Unable to register component, component doesn't have an uuid.");
			return null;
		}

		if (componentData && componentData.properties) {
			for (const [, property] of Object.entries(componentData.properties)) {
				if (!property.type && property.defaultValue != undefined) {
					if (typeof property.defaultValue == "number") {
						property.type = Number;
					} else {
						property.type = property.defaultValue.constructor;
					}
				}
			}
		}

		this.components.set(componentData.uuid, componentData);
		return componentData;
	}

	getComponentDataForUuid(uuid) {
		return this.components.get(uuid);
	}

	*getAllComponents() {
		for (const component of this.components.values()) {
			yield component;
		}
	}

	getComponentFromData(componentData, registerIfNotFound = true) {
		const component = this.components.get(componentData.uuid);
		if (component) {
			return component;
		} else if (registerIfNotFound) {
			return this.registerComponent(componentData);
		}
		return null;
	}
}
