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
				for(const component of child.getComponentsByType(MeshComponent)){
					this.renderMeshComponent(component);
				}
			}
		}
	}

	renderMeshComponent(component){
		let mesh = component.mesh;
		let materials = component.materials;

		mesh.updateBuffersGl(this.gl);

		for(const material of materials){
			//todo: only init necessary materials
			material.compileShader(this.gl);

			const positionAttrib = material.shader.getAttribLocation("aVertexPosition");
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.positionBuffer);
			this.gl.vertexAttribPointer(positionAttrib, 3, this.gl.FLOAT, false, 0, 0);
			this.gl.enableVertexAttribArray(positionAttrib);

			material.shader.use(this.gl);
			this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
		}

		// this.gl.drawElements(this.gl.TRIANGLES, 6)
	}
}
