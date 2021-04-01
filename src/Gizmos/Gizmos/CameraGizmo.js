import Gizmo from "./Gizmo.js";
import Mesh from "../../Core/Mesh.js";
import Vec2 from "../../Math/Vec2.js";

export default class CameraGizmo extends Gizmo{
	constructor(){
		super(...arguments);

		this.addCircle(30, 20);
		this.addCircle(30, 14);
		this.addCircle(6, 4, new Vec2(5, 5));
		this.updateMesh();
	}
}
