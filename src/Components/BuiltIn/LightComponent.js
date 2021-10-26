import {StorageType} from "../../index.js";
import Vec3 from "../../Math/Vec3.js";
// import {StorageType} from "../../Util/BinaryComposer.js";
import {Component} from "../Components.js";

const lightTypes = ["point", "directional", "spot"];

export default class LightComponent extends Component {
	static get componentName() {
		return "Light";
	}
	static get uuid() {
		return "b08e7f42-3919-47e4-ae3e-046e99362090";
	}

	/**
	 * @override
	 * @returns {import("../../../editor/src/UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure}
	 */
	static get guiStructure() {
		return {
			lightType: {
				type: "dropdown",
				guiOpts: {
					items: lightTypes,
				},
			},
			color: {
				type: "vec3",
			},
		};
	}

	/**
	 * @returns {import("../../Util/BinaryComposer.js").BinaryComposerObjectToBinaryOptions}
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
	 * @param {*} propertyValues
	 * @param {import("../Component.js").ComponentConstructorRestArgs} args
	 */
	constructor(propertyValues = {}, ...args) {
		super();

		this.type = lightTypes[0];
		this.color = new Vec3(1, 1, 1);

		this.initValues(propertyValues, ...args);
	}
}
