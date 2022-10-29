import {StorageType} from "../../util/binarySerialization.js";
import {RenderOutputConfig} from "../../rendering/RenderOutputConfig.js";
import {ClusteredLightsConfig} from "../../rendering/ClusteredLightsConfig.js";
import {EDITOR_DEFAULTS_IN_COMPONENTS} from "../../engineDefines.js";
import {Component} from "../Component.js";
import {Vec4} from "../../math/Vec4.js";
import {Mat4} from "../../math/Mat4.js";
import {createTreeViewStructure} from "../../../editor/src/ui/propertiesTreeView/createStructureHelpers.js";
import {getRaycastRayFromScreenPos, screenToWorldPos, worldToScreenPos} from "../../util/cameraUtil.js";

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
		const structure = createTreeViewStructure({
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
		});

		if (EDITOR_DEFAULTS_IN_COMPONENTS) {
			const defaultClusteredLightsConfigAssetLinkUuid = "f676813d-a631-4a39-9bb4-1ea1f291af19";
			const guiOpts = /** @type {import("../../../editor/src/ui/DroppableGui.js").DroppableGuiOptions<unknown>} */ (structure.clusteredLightsConfig.guiOpts);
			guiOpts.defaultValue = defaultClusteredLightsConfigAssetLinkUuid;
		}

		return structure;
	}

	/**
	 * @returns {import("../../util/binarySerialization.js").ObjectToBinaryOptions<any>}
	 */
	static get binarySerializationOpts() {
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
	 * @param {import("../types.js").ComponentPropertyValues<typeof CameraComponent>} propertyValues
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
		/** @type {RenderOutputConfig?} */
		this.renderOutputConfig = null;
		/** @type {ClusteredLightsConfig?} */
		this.clusteredLightsConfig = null;

		this.initValues(propertyValues, ...args);
	}

	// todo: cache the value
	updateProjectionMatrixIfEnabled() {
		if (!this.autoUpdateProjectionMatrix) return;
		this.projectionMatrix = Mat4.createDynamicAspectPerspective(this.fov, this.clipNear, this.clipFar, this.aspect);
	}

	/**
	 * Converts given world coordinates to screen coordinates and returns a new vector.
	 * Screen coordinates are in the range [0, 1] with y axis down.
	 * The returned z component will be the distance from the camera.
	 * @param {import("../../math/Vec3.js").Vec3} worldPos
	 */
	worldToScreenPos(worldPos) {
		this.updateProjectionMatrixIfEnabled();
		return worldToScreenPos(worldPos, this.projectionMatrix, this.entity?.worldMatrix);
	}

	/**
	 * @param {import("../../math/Vec3.js").Vec3} worldPos
	 */
	screenToWorldPos(worldPos) {
		this.updateProjectionMatrixIfEnabled();
		return screenToWorldPos(worldPos, this.projectionMatrix, this.entity?.worldMatrix);
	}

	/**
	 * @param {import("../../math/Vec3.js").Vec3Parameters} screenPos
	 */
	getRaycastRayFromScreenPos(...screenPos) {
		this.updateProjectionMatrixIfEnabled();
		const vec = new Vec4(...screenPos);
		return getRaycastRayFromScreenPos(vec, this.projectionMatrix, this.entity?.worldMatrix);
	}
}

// if (EDITOR_DEFAULTS_IN_COMPONENTS) {
// 	const defaultClusteredLightsAssetLinkUuid = "f676813d-a631-4a39-9bb4-1ea1f291af19";
// 	CameraComponent.properties.clusteredLightsConfig.defaultValue = defaultClusteredLightsAssetLinkUuid;
// }
