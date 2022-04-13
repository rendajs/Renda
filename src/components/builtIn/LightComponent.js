import {StorageType} from "../../util/binarySerialization.js";
import {Vec3} from "../../math/Vec3.js";
import {Component} from "../Component.js";
import {createTreeViewStructure} from "../../../editor/src/ui/propertiesTreeView/createStructureHelpers.js";

const lightTypes = ["point", "directional", "spot"];

export class LightComponent extends Component {
	static get componentName() {
		return "Light";
	}
	static get uuid() {
		return "b08e7f42-3919-47e4-ae3e-046e99362090";
	}

	/**
	 * @override
	 */
	static get guiStructure() {
		return createTreeViewStructure({
			lightType: {
				type: "dropdown",
				guiOpts: {
					items: lightTypes,
				},
			},
			color: {
				type: "vec3",
			},
		});
	}

	/**
	 * @returns {import("../../util/binarySerialization.js").ObjectToBinaryOptions<any>}
	 */
	static get binaryComposerOpts() {
		return {
			structure: {
				lightType: lightTypes,
				color: [StorageType.FLOAT64],
			},
			nameIds: {
				lightType: 1,
				color: 2,
			},
		};
	}

	/**
	 * @param {import("../types.js").ComponentPropertyValues<typeof LightComponent>} propertyValues
	 * @param {import("../Component.js").ComponentConstructorRestArgs} args
	 */
	constructor(propertyValues = {}, ...args) {
		super();

		this.type = lightTypes[0];
		this.color = new Vec3(1, 1, 1);

		this.initValues(propertyValues, ...args);
	}
}
