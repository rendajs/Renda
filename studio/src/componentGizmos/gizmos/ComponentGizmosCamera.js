import {ComponentGizmos} from "./ComponentGizmos.js";
import {CameraClusterDataGizmo, CameraComponent, CameraGizmo, CameraIconGizmo, Vec3} from "../../../../src/mod.js";
import {SingleInstancePromise} from "../../../../src/util/SingleInstancePromise.js";
import {ENABLE_WEBGPU_CLUSTERED_LIGHTS} from "../../../../src/studioDefines.js";

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

		// Debugging cluster bounds dus currently not work out of the box. To debug:
		// - set this.debugClusterBounds to true
		// - add GPUBufferUsage.COPY_SRC to the "ClusteredComputeManager boundsBuffer"
		// - Update the cluster bounds of a camera in a scene:
		//   - Add an entity with camera component to the scene
		//   - Make sure the camera entity is selected
		//   - Click the entity editor window to make it the last focused window
		//   - run the following in the browser console:
		//     studio.renderer.render(studio.windowManager.lastFocusedContentWindow.domTarget, studio.selected.entity.components[0])
		// - Adjust a property of the camera component in order to rerender the entity editor with updated debug bounds.
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
		const clusterComputeManager = this.studio.renderer.getCachedCameraData(this.component).clusterComputeManager;
		if (!clusterComputeManager || !clusterComputeManager.boundsBuffer || !clusterComputeManager.config) return;
		const buffer = await this.studio.renderer.inspectBuffer(clusterComputeManager.boundsBuffer, clusterComputeManager.config.totalClusterCount * 32);

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
