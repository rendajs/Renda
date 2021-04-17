import ComponentGizmos from "./ComponentGizmos.js";
import {CameraComponent, defaultComponentTypeManager, CameraIconGizmo, CameraGizmo} from "../../../../src/index.js";

export default class ComponentGizmosCamera extends ComponentGizmos{

	static componentType = CameraComponent;
	static requiredGizmos = [CameraIconGizmo, CameraGizmo];

	constructor(){
		super(...arguments);
	}

	componentPropertyChanged(){
		const cameraGizmo = this.createdGizmos[1];
		cameraGizmo.setProjectionMatrix(this.component.projectionMatrix);
	}
}
