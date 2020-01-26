import {Vector3, Quaternion} from "../../../../src/index.js";

export default class OrbitControls{
	constructor(camera, eventElement){
		this.camera = camera;

		this.lookPos = new Vector3();
		this.lookRot = new Quaternion();
		this.lookDist = 10;

		if(eventElement) this.addEventElement(eventElement);
	}

	addEventElement(elem){
		elem.addEventListener("wheel", e => {
			this.lookRot.rotateAxisAngle(new Vector3(0,1,0), e.deltaX);
		});
	}

	loop(){
		this.updateCamPos();
	}

	updateCamPos(){

	}
}
