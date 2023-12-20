import {StorageType} from "../../util/binarySerialization.js";
import {RenderOutputConfig} from "../../rendering/RenderOutputConfig.js";
import {ClusteredLightsConfig} from "../../rendering/ClusteredLightsConfig.js";
import {STUDIO_DEFAULTS_IN_COMPONENTS} from "../../studioDefines.js";
import {Component} from "../Component.js";
import {Vec4} from "../../math/Vec4.js";
import {Mat4} from "../../math/Mat4.js";
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
		const structure = /** @satisfies {import("../../../studio/src/ui/propertiesTreeView/types.ts").PropertiesTreeViewStructure} */ ({
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
					defaultValue: 0.1,
				},
			},
			clipFar: {
				type: "number",
				guiOpts: {
					min: 0,
					defaultValue: 1000,
				},
			},
			aspectRatio: {
				type: "number",
				guiOpts: {
					min: 0,
					defaultValue: 1,
				},
			},
			autoUpdateAspectRatio: {
				type: "boolean",
				guiOpts: {
					defaultValue: true,
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

		if (STUDIO_DEFAULTS_IN_COMPONENTS) {
			const defaultClusteredLightsConfigAssetLinkUuid = "f676813d-a631-4a39-9bb4-1ea1f291af19";
			const guiOpts = /** @type {import("../../../studio/src/ui/DroppableGui.js").DroppableGuiOptions<any>} */ (structure.clusteredLightsConfig.guiOpts);
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
				aspectRatio: StorageType.FLOAT64,
				autoUpdateAspectRatio: StorageType.BOOL,
				autoUpdateProjectionMatrix: StorageType.BOOL,
				renderOutputConfig: StorageType.ASSET_UUID,
				clusteredLightsConfig: StorageType.ASSET_UUID,
			},
			nameIds: {
				fov: 1,
				clipNear: 2,
				clipFar: 3,
				aspectRatio: 4,
				autoUpdateAspectRatio: 5,
				autoUpdateProjectionMatrix: 6,
				renderOutputConfig: 7,
				clusteredLightsConfig: 8,
			},
		};
	}

	/**
	 * @param {import("../types.ts").ComponentPropertyValues<typeof CameraComponent>} propertyValues
	 * @param {import("../Component.js").ComponentConstructorRestArgs} args
	 */
	constructor(propertyValues = {}, ...args) {
		super();

		/** @private */
		this._fov = 90;
		/** @private */
		this._clipNear = 0.1;
		/** @private */
		this._clipFar = 1000;
		/** @private */
		this._aspectRatio = 1;
		this.autoUpdateAspectRatio = true;
		this.autoUpdateProjectionMatrix = true;
		this.projectionMatrix = new Mat4();
		/** @type {RenderOutputConfig?} */
		this.renderOutputConfig = null;
		/** @type {ClusteredLightsConfig?} */
		this.clusteredLightsConfig = null;

		/** @private */
		this._projectionMatrixDirty = true;

		this.initValues(propertyValues, ...args);
	}

	get fov() {
		return this._fov;
	}
	set fov(value) {
		if (this._fov == value) return;
		this._fov = value;
		this._projectionMatrixDirty = true;
	}

	get clipNear() {
		return this._clipNear;
	}
	set clipNear(value) {
		if (this._clipNear == value) return;
		this._clipNear = value;
		this._projectionMatrixDirty = true;
	}

	get clipFar() {
		return this._clipFar;
	}
	set clipFar(value) {
		if (this._clipFar == value) return;
		this._clipFar = value;
		this._projectionMatrixDirty = true;
	}

	get aspectRatio() {
		return this._aspectRatio;
	}
	set aspectRatio(value) {
		if (this._aspectRatio == value) return;
		this._aspectRatio = value;
		this._projectionMatrixDirty = true;
	}

	updateProjectionMatrixIfEnabled() {
		if (!this.autoUpdateProjectionMatrix || !this._projectionMatrixDirty) return;
		this.projectionMatrix = Mat4.createDynamicAspectPerspective(this.fov, this.clipNear, this.clipFar, this.aspectRatio);
		this._projectionMatrixDirty = false;
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

// if (STUDIO_DEFAULTS_IN_COMPONENTS) {
// 	const defaultClusteredLightsAssetLinkUuid = "f676813d-a631-4a39-9bb4-1ea1f291af19";
// 	CameraComponent.properties.clusteredLightsConfig.defaultValue = defaultClusteredLightsAssetLinkUuid;
// }
