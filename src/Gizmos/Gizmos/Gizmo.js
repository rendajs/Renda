import Entity from "../../Core/Entity.js";
import DefaultComponentTypes from "../../Components/DefaultComponentTypes.js";
import Vec3 from "../../Math/Vec3.js";
import Vec2 from "../../Math/Vec2.js";
import Mesh from "../../Core/Mesh.js";

export default class Gizmo{
	constructor(gizmoManager){
		this.gizmoManager = gizmoManager;
		this.entity = new Entity("gizmo");

		this.mesh = new Mesh();
		this.mesh.setVertexState(gizmoManager.vertexState);

		this.entity.addComponent(DefaultComponentTypes.mesh, {
			mesh: this.mesh,
			materials: [gizmoManager.gizmoMaterial],
		});
		this.entity.pos = new Vec3();
	}

	destructor(){
		this.entity.detachParent();
		this.mesh.destructor();
		this.mesh = null;
	}
}
