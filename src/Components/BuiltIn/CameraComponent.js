import {StorageType} from "../../util/BinaryComposer.js";
import {RenderOutputConfig} from "../../Rendering/RenderOutputConfig.js";
import {ClusteredLightsConfig} from "../../Rendering/ClusteredLightsConfig.js";
import {EDITOR_DEFAULTS_IN_COMPONENTS} from "../../engineDefines.js";
import {Component} from "../mod.js";
import {Mat4} from "../../mod.js";

export class CameraComponent extends Component {
	static get componentName() {
		return "Camera";
	}
	static get uuid() {
		return "1a78b3f2-7688-4776-b512-ed1ee2326d8a";
	}

	/**
	 * @override
	 */
	static get guiStructure() {
		/** @type {import("../../../editor/src/UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure} */
		const structure = {
			fov: {
				type: "number",
				guiOpts: {
					min: 0,
					max: 180,
				},
			},
			clipNear: {
				type: "number",
				guiOpts: {
					min: 0,
					defaultValue: 0.01,
				},
			},
			clipFar: {
				type: "number",
				guiOpts: {
					min: 0,
					defaultValue: 1000,
				},
			},
			aspect: {
				type: "number",
				guiOpts: {
					min: 0,
					defaultValue: 1,
				},
			},
			autoUpdateProjectionMatrix: {
				type: "boolean",
				guiOpts: {
					defaultValue: true,
				},
			},
			renderOutputConfig: {
				type: "droppable",
				guiOpts: {
					supportedAssetTypes: [RenderOutputConfig],
				},
			},
			clusteredLightsConfig: {
				type: "droppable",
				guiOpts: {
					supportedAssetTypes: [ClusteredLightsConfig],
				},
			},
			// autoManageRootRenderEntities: {
			// 	type: "bool",
			// 	defaultValue: true,
			// },
			// rootRenderEntities: {
			// 	type: "array",
			// }
		};

		if (EDITOR_DEFAULTS_IN_COMPONENTS) {
			const defaultClusteredLightsConfigAssetLinkUuid = "f676813d-a631-4a39-9bb4-1ea1f291af19";
			const guiOpts = /** @type {import("../../../editor/src/UI/DroppableGui.js").DroppableGuiOptions} */ (structure.clusteredLightsConfig.guiOpts);
			guiOpts.defaultValue = defaultClusteredLightsConfigAssetLinkUuid;
		}

		return structure;
	}

	/**
	 * @returns {import("../../util/BinaryComposer.js").BinaryComposerObjectToBinaryOptions}
	 */
	static get binaryComposerOpts() {
		return {
			structure: {
				fov: StorageType.FLOAT64,
				clipNear: StorageType.FLOAT64,
				clipFar: StorageType.FLOAT64,
				aspect: StorageType.FLOAT64,
				renderOutputConfig: StorageType.ASSET_UUID,
				clusteredLightsConfig: StorageType.ASSET_UUID,
			},
			nameIds: {
				fov: 1,
				clipNear: 2,
				clipFar: 3,
				aspect: 4,
				renderOutputConfig: 5,
				clusteredLightsConfig: 6,
			},
		};
	}

	/**
	 * @param {*} propertyValues
	 * @param {import("../Component.js").ComponentConstructorRestArgs} args
	 */
	constructor(propertyValues = {}, ...args) {
		super();

		this.fov = 90;
		this.clipNear = 0.01;
		this.clipFar = 1000;
		this.aspect = 1;
		this.autoUpdateProjectionMatrix = true;
		this.projectionMatrix = new Mat4();
		this.renderOutputConfig = null;
		/** @type {ClusteredLightsConfig?} */
		this.clusteredLightsConfig = null;

		this.initValues(propertyValues, ...args);
	}
}

// if (EDITOR_DEFAULTS_IN_COMPONENTS) {
// 	const defaultClusteredLightsAssetLinkUuid = "f676813d-a631-4a39-9bb4-1ea1f291af19";
// 	CameraComponent.properties.clusteredLightsConfig.defaultValue = defaultClusteredLightsAssetLinkUuid;
// }
