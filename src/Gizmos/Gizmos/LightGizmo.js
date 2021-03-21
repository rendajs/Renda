import Gizmo from "./Gizmo.js";
import Mesh from "../../Core/Mesh.js";
import Vec2 from "../../Math/Vec2.js";
import Vec3 from "../../Math/Vec3.js";

export default class LightGizmo extends Gizmo{
	constructor(){
		super(...arguments);

		const indices = [];
		const positions = [];
		const colors = [];

		//circle
		const circleSegments = 30;
		for(let i=0; i<circleSegments; i++){
			const theta = i/circleSegments * Math.PI * 2;
			const x = Math.cos(theta);
			const y = Math.sin(theta);
			const pos = new Vec2(x,y);
			pos.multiply(10);
			positions.push(pos);
			colors.push(new Vec3(1,1,1));
			indices.push(i);
			if(i == circleSegments - 1){
				indices.push(0);
			}else{
				indices.push(i+1);
			}
		}

		//rays
		const raySegments = 12;
		let vertIndex = positions.length;
		for(let i=0; i<raySegments; i++){
			const theta = i/raySegments * Math.PI * 2;
			const x = Math.cos(theta);
			const y = Math.sin(theta);
			const pos1 = new Vec2(x,y);
			const pos2 = pos1.clone();
			pos1.multiply(20);
			pos2.multiply(40);
			positions.push(pos1, pos2);
			colors.push(new Vec3(1,1,1), new Vec3(1,1,1));
			indices.push(vertIndex++, vertIndex++);
		}

		this.mesh.setVertexCount(positions.length);
		this.mesh.setIndexData(indices);
		this.mesh.setVertexData(Mesh.AttributeType.POSITION, positions, {unusedFormat: Mesh.AttributeFormat.FLOAT32, unusedComponentCount: 2});
		this.mesh.setVertexData(Mesh.AttributeType.COLOR, colors, {unusedFormat: Mesh.AttributeFormat.FLOAT32, unusedComponentCount: 3});
	}
}
