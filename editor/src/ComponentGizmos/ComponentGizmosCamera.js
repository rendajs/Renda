import {getEditorInstance} from "../editorInstance.js";
import ComponentGizmos from "./ComponentGizmos.js";
import {CameraClusterDataGizmo, CameraComponent, CameraGizmo, CameraIconGizmo, Vec3} from "../../../src/mod.js";
import SingleInstancePromise from "../../../src/util/SingleInstancePromise.js";

export default class ComponentGizmosCamera extends ComponentGizmos {
	static componentType = CameraComponent;
	static requiredGizmos = [CameraIconGizmo, CameraGizmo, CameraClusterDataGizmo];

	constructor(...args) {
		super(...args);

		this.debugClusterBounds = false;
		this.updateClusterBoundsInstance = new SingleInstancePromise(this.updateClusterBounds.bind(this), {once: false});
	}

	componentPropertyChanged() {
		const cameraGizmo = this.createdGizmos[1];
		cameraGizmo.setProjectionMatrix(this.component.projectionMatrix);

		if (this.debugClusterBounds) {
			this.updateClusterBoundsInstance.run();
		}
	}

	async updateClusterBounds() {
		const clusterDataGizmo = this.createdGizmos[2];
		const clusterComputeManager = getEditorInstance().renderer.getCachedCameraData(this.component).clusterComputeManager;
		const buffer = await getEditorInstance().renderer.inspectBuffer(clusterComputeManager.boundsBuffer, clusterComputeManager.config.totalClusterCount * 32);

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
