import Gizmo from "./Gizmo.js";
import Mesh from "../../Core/Mesh.js";
import DefaultComponentTypes from "../../Components/DefaultComponentTypes.js";
import Vec3 from "../../Math/Vec3.js";
import Mat4 from "../../Math/Mat4.js";

export default class CameraGizmo extends Gizmo{
	constructor(){
		super(...arguments);

		this.mesh = new Mesh();
		this.mesh.setVertexState(this.gizmoManager.meshVertexState);

		const indices = [0,1,1,3,3,2,2,0,  0,4, 1,5, 2,6, 3,7,  4,5,5,7,7,6,6,4];
		const positions = [
			new Vec3(-1,-1,-1),
			new Vec3(-1,-1, 1),
			new Vec3(-1, 1,-1),
			new Vec3(-1, 1, 1),
			new Vec3( 1,-1,-1),
			new Vec3( 1,-1, 1),
			new Vec3( 1, 1,-1),
			new Vec3( 1, 1, 1),
		];
		const colors = [
			new Vec3(1,1,1),
			new Vec3(1,1,1),
			new Vec3(1,1,1),
			new Vec3(1,1,1),
			new Vec3(1,1,1),
			new Vec3(1,1,1),
			new Vec3(1,1,1),
			new Vec3(1,1,1),
		];

		this.entity.addComponent(DefaultComponentTypes.mesh, {
			mesh: this.mesh,
			materials: [this.gizmoManager.meshMaterial],
		});

		this.mesh.setVertexCount(positions.length);
		this.mesh.setIndexData(indices);
		this.mesh.setVertexData(Mesh.AttributeType.COLOR, colors);
	}

	setProjectionMatrix(projection){
		const positions = [
			new Vec3(-1,-1,-1),
			new Vec3(-1,-1, 1),
			new Vec3(-1, 1,-1),
			new Vec3(-1, 1, 1),
			new Vec3( 1,-1,-1),
			new Vec3( 1,-1, 1),
			new Vec3( 1, 1,-1),
			new Vec3( 1, 1, 1),
		];
		for(const pos of positions){
			pos.multiplyMatrix(projection);
		}
		this.mesh.setVertexData(Mesh.AttributeType.POSITION, positions);
	}
}
