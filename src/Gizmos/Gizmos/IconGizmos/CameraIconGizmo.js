import IconGizmo from "./IconGizmo.js";
import Vec2 from "../../../Math/Vec2.js";

export default class CameraIconGizmo extends IconGizmo {
	constructor(...args) {
		super(...args);

		this.addCircle(30, 20);
		this.addCircle(30, 14);
		this.addCircle(6, 4, new Vec2(5, 5));
		this.updateMesh();
	}
}
