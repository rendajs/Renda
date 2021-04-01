import Gizmo from "./Gizmo.js";
import Mesh from "../../Core/Mesh.js";
import Vec2 from "../../Math/Vec2.js";
import Vec3 from "../../Math/Vec3.js";

export default class CameraGizmo extends Gizmo{
	constructor(){
		super(...arguments);

		const indices = [];
		const positions = [];
		const colors = [];

		//big circle
		const bigCircleSegments = 30;
		for(let i=0; i<bigCircleSegments; i++){
			const theta = i/bigCircleSegments * Math.PI * 2;
			const x = Math.cos(theta);
			const y = Math.sin(theta);
			const pos = new Vec2(x,y);
			pos.multiply(20);
			positions.push(pos);
			colors.push(new Vec3(1,1,1));
			indices.push(i);
			if(i == bigCircleSegments - 1){
				indices.push(0);
			}else{
				indices.push(i+1);
			}
		}

		this.mesh.setVertexCount(positions.length);
		this.mesh.setIndexData(indices);
		this.mesh.setVertexData(Mesh.AttributeType.POSITION, positions, {unusedFormat: Mesh.AttributeFormat.FLOAT32, unusedComponentCount: 2});
		this.mesh.setVertexData(Mesh.AttributeType.COLOR, colors, {unusedFormat: Mesh.AttributeFormat.FLOAT32, unusedComponentCount: 3});

	}
}
