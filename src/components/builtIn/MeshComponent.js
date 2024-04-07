import { Mesh } from "../../core/Mesh.js";
import { STUDIO_DEFAULTS_IN_COMPONENTS } from "../../engineDefines.js";
import { StorageType } from "../../util/binarySerialization.js";
import { Material } from "../../rendering/Material.js";
import { Component } from "../Component.js";

export class MeshComponent extends Component {
	static get componentName() {
		return "Mesh";
	}
	static get uuid() {
		return "c7fc3a04-fa51-49aa-8f04-864c0cebf49c";
	}

	/**
	 * @override
	 */
	static get guiStructure() {
		const structure = /** @satisfies {import("../../../studio/src/ui/propertiesTreeView/types.ts").PropertiesTreeViewStructure} */ ({
			mesh: {
				type: "droppable",
				guiOpts: {
					supportedAssetTypes: [Mesh],
				},
			},
			materials: {
				type: "array",
				guiOpts: {
					arrayType: "droppable",
					arrayGuiOpts: {
						supportedAssetTypes: [Material],
					},
				},
			},
		});
		if (STUDIO_DEFAULTS_IN_COMPONENTS) {
			const defaultMaterialAssetLinkUuid = "f1e469e3-b463-4542-952a-091487bf5b4a";
			const guiOpts = /** @type {import("../../../studio/src/ui/ArrayGui.js").ArrayGuiOptions<"droppable">} */ (structure.materials.guiOpts);
			guiOpts.defaultValue = [defaultMaterialAssetLinkUuid];
		}
		return structure;
	}

	/**
	 * @returns {import("../../util/binarySerialization.js").ObjectToBinaryOptions<any>}
	 */
	static get binarySerializationOpts() {
		return {
			structure: {
				mesh: StorageType.ASSET_UUID,
				materials: [StorageType.ASSET_UUID],
			},
			nameIds: {
				mesh: 1,
				materials: 2,
			},
		};
	}

	/**
	 * @param {import("../types.ts").ComponentPropertyValues<typeof MeshComponent>} propertyValues
	 * @param {import("../Component.js").ComponentConstructorRestArgs} args
	 */
	constructor(propertyValues = {}, ...args) {
		super();

		/** @type {Mesh?} */
		this.mesh = null;
		/** @type {(Material | null)[]} */
		this.materials = [];

		this.initValues(propertyValues, ...args);
	}
}
