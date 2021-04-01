import IconGizmo from "./IconGizmo.js";
import Vec2 from "../../../Math/Vec2.js";

export default class LightIconGizmo extends IconGizmo{
	constructor(){
		super(...arguments);

		this.addCircle(30, 10);

		//rays
		const raySegments = 12;
		for(let i=0; i<raySegments; i++){
			const theta = i/raySegments * Math.PI * 2;
			const x = Math.cos(theta);
			const y = Math.sin(theta);
			const pos1 = new Vec2(x,y);
			const pos2 = pos1.clone();
			pos1.multiply(20);
			pos2.multiply(40);
			this.addLine(pos1, pos2);
		}

		this.updateMesh();
	}
}
