import editor from "../editorInstance.js";
import ComponentGizmos from "./ComponentGizmos.js";
import {CameraComponent, defaultComponentTypeManager, CameraIconGizmo, CameraGizmo, CameraClusterDataGizmo, Vec3, SingleInstancePromise} from "../../../../src/index.js";

export default class ComponentGizmosCamera extends ComponentGizmos{

	static componentType = CameraComponent;
	static requiredGizmos = [CameraIconGizmo, CameraGizmo, CameraClusterDataGizmo];

	constructor(){
		super(...arguments);

		this.debugClusterBounds = false;
		this.updateClusterBoundsInstance = new SingleInstancePromise(this.updateClusterBounds.bind(this), {once: false});
	}

	componentPropertyChanged(){
		const cameraGizmo = this.createdGizmos[1];
		cameraGizmo.setProjectionMatrix(this.component.projectionMatrix);

		if(this.debugClusterBounds){
			this.updateClusterBoundsInstance.run();
		}
	}

	async updateClusterBounds(){
		const clusterDataGizmo = this.createdGizmos[2];
		const clusterSetup = editor.renderer.getCachedCameraData(this.component).clusterSetup;
		const buffer = await editor.renderer.inspectBuffer(clusterSetup.boundsBuffer, clusterSetup.totalClusterCount * 32);

		const clusterBoundsData = [];
		const dataView = new DataView(buffer);
		for(let i=0; i<buffer.byteLength; i+=(4*4)){
			const x = dataView.getFloat32(i, true);
			const y = dataView.getFloat32(i+4, true);
			const z = dataView.getFloat32(i+8, true);
			clusterBoundsData.push(new Vec3(x,y,z));
		}

		clusterDataGizmo.setClusterBoundsData(clusterBoundsData);
	}
}
