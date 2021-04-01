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

		this.indices = [];
		this.positions = [];
		this.colors = [];

		this.entity.addComponent(DefaultComponentTypes.mesh, {
			mesh: this.mesh,
			materials: [gizmoManager.gizmoMaterial],
		});
		this.entity.pos = new Vec3();
	}

	get pos(){
		return this.entity.pos;
	}

	set pos(val){
		this.entity.pos = val;
	}

	destructor(){
		this.entity.detachParent();
		this.mesh.destructor();
		this.mesh = null;
	}

	updateMesh(){
		this.mesh.setVertexCount(this.positions.length);
		this.mesh.setIndexData(this.indices);
		this.mesh.setVertexData(Mesh.AttributeType.POSITION, this.positions, {unusedFormat: Mesh.AttributeFormat.FLOAT32, unusedComponentCount: 2});
		this.mesh.setVertexData(Mesh.AttributeType.COLOR, this.colors, {unusedFormat: Mesh.AttributeFormat.FLOAT32, unusedComponentCount: 3});
	}

	addCircle(segments, radius, origin = new Vec2()){
		const startIndex = this.positions.length;
		for(let i=0; i<segments; i++){
			const theta = i/segments * Math.PI * 2;
			const x = Math.cos(theta);
			const y = Math.sin(theta);
			const pos = new Vec2(x,y);
			pos.multiply(radius);
			pos.add(origin);
			this.positions.push(pos);
			this.colors.push(new Vec3(1,1,1));
			this.indices.push(startIndex + i);
			if(i == segments - 1){
				this.indices.push(startIndex);
			}else{
				this.indices.push(startIndex + i + 1);
			}
		}
	}

	addLine(start, end){
		const startIndex = this.positions.length;
		this.positions.push(start, end);
		this.colors.push(new Vec3(1,1,1), new Vec3(1,1,1));
		this.indices.push(startIndex, startIndex + 1);
	}
}
