// import {StorageType} from "../../Util/BinaryComposer.js";
import RenderOutputConfig from "../../Rendering/RenderOutputConfig.js";
import ClusteredLightsConfig from "../../Rendering/ClusteredLightsConfig.js";
// import {EDITOR_DEFAULTS_IN_COMPONENTS} from "../../engineDefines.js";
import {Component} from "../Components.js";
import {Mat4, StorageType} from "../../index.js";

export default class CameraComponent extends Component {
	static get componentName() {
		return "Camera";
	}
	static get uuid() {
		return "1a78b3f2-7688-4776-b512-ed1ee2326d8a";
	}

	/**
	 * @override
	 * @returns {import("../../../editor/src/UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure}
	 */
	static get guiStructure() {
		return {
			fov: {
				type: "number",
				guiOpts: {
					min: 0,
					max: 180,
				},
			},
			clipNear: {
				type: "number",
				defaultValue: 0.01,
				/** @type {import("../../../editor/src/UI/NumericGui.js").NumericGuiOptions} */
				guiOpts: {
					min: 0,
				},
			},
			clipFar: {
				type: "number",
				defaultValue: 1000,
				/** @type {import("../../../editor/src/UI/NumericGui.js").NumericGuiOptions} */
				guiOpts: {
					min: 0,
				},
			},
			aspect: {
				type: "number",
				defaultValue: 1,
				/** @type {import("../../../editor/src/UI/NumericGui.js").NumericGuiOptions} */
				guiOpts: {
					min: 0,
				},
			},
			autoUpdateProjectionMatrix: {
				type: "boolean",
				defaultValue: true,
			},
			projectionMatrix: {
				// type: Mat4,
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
	}

	/**
	 * @returns {import("../../Util/BinaryComposer.js").BinaryComposerObjectToBinaryOptions}
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
	 * @param {ConstructorParameters<typeof Component>} args
	 */
	constructor(...args) {
		super(...args);

		this.fov = 90;
		this.clipNear = 0.01;
		this.clipFar = 1000;
		this.aspect = 1;
		this.autoUpdateProjectionMatrix = true;
		this.projectionMatrix = new Mat4();
		this.renderOutputConfig = null;
		this.clusteredLightsConfig = null;
	}
}

// if (EDITOR_DEFAULTS_IN_COMPONENTS) {
// 	const defaultClusteredLightsAssetLinkUuid = "f676813d-a631-4a39-9bb4-1ea1f291af19";
// 	CameraComponent.properties.clusteredLightsConfig.defaultValue = defaultClusteredLightsAssetLinkUuid;
// }
