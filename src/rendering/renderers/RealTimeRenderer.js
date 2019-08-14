import Renderer from "./Renderer.js";
import MeshComponent from "../../components/MeshComponent.js";

export default class RealTimeRenderer extends Renderer{
	constructor(){
		super();

		this.canvas = null;
		this.gl = null;
	}

	init(){
		this.canvas = document.createElement("canvas");
		this.gl = this.canvas.getContext("webgl");
		this.gl.clearColor(0, 0, 0, 1);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
	}

	render(camera){
		let meshComponents = [];
		for(const root of camera.rootRenderObjects){
			for(const child of root.traverse()){
				meshComponents = [...meshComponents, ...child.getComponentsByType(MeshComponent)];
			}
		}
	}
}
