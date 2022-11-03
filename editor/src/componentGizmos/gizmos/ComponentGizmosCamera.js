import {ComponentGizmos} from "./ComponentGizmos.js";
import {CameraClusterDataGizmo, CameraComponent, CameraGizmo, CameraIconGizmo, Vec3} from "../../../../src/mod.js";
import {SingleInstancePromise} from "../../../../src/util/SingleInstancePromise.js";
import {ENABLE_WEBGPU_CLUSTERED_LIGHTS} from "../../../../src/engineDefines.js";

/**
 * @extends {ComponentGizmos<CameraComponent, [CameraIconGizmo, CameraGizmo, CameraClusterDataGizmo]>}
 */
export class ComponentGizmosCamera extends ComponentGizmos {
	static componentType = CameraComponent;
	static requiredGizmos = [CameraIconGizmo, CameraGizmo, CameraClusterDataGizmo];

	/**
	 * @param {import("./ComponentGizmos.js").ComponentGizmosConstructorParameters<CameraComponent>} args
	 */
	constructor(...args) {
		super(...args);

		this.debugClusterBounds = false;
		this.updateClusterBoundsInstance = new SingleInstancePromise(this.updateClusterBounds.bind(this));
	}

	componentPropertyChanged() {
		const cameraGizmo = this.createdGizmos[1];
		this.component.updateProjectionMatrixIfEnabled();
		cameraGizmo.setProjectionMatrix(this.component.projectionMatrix);

		if (this.debugClusterBounds) {
			this.updateClusterBoundsInstance.run();
		}
	}

	async updateClusterBounds() {
		if (!ENABLE_WEBGPU_CLUSTERED_LIGHTS) return;
		const clusterDataGizmo = this.createdGizmos[2];
		const clusterComputeManager = this.editor.renderer.getCachedCameraData(this.component).clusterComputeManager;
		if (!clusterComputeManager || !clusterComputeManager.boundsBuffer || !clusterComputeManager.config) return;
		const buffer = await this.editor.renderer.inspectBuffer(clusterComputeManager.boundsBuffer, clusterComputeManager.config.totalClusterCount * 32);

		const clusterBoundsData = [];
		const dataView = new DataView(buffer);
		for (let i = 0; i < buffer.byteLength; i += (4 * 4)) {
			const x = dataView.getFloat32(i, true);
			const y = dataView.getFloat32(i + 4, true);
			const z = dataView.getFloat32(i + 8, true);
			clusterBoundsData.push(new Vec3(x, y, z));
		}

		clusterDataGizmo.setClusterBoundsData(clusterBoundsData);
	}
}
