import Renderer from "./Renderer.js";
import MeshComponent from "../../Components/MeshComponent.js";
import Mat4 from "../../Math/Mat4.js";

export default class RealTimeRenderer extends Renderer{
	constructor(){
		super();

		this.canvas = null;
		this.gl = null;
	}

	init(){
		this.canvas = document.createElement("canvas");
		this.canvas.width = this.canvas.height = 300;
		this.gl = this.canvas.getContext("webgl");
		this.gl.enable(this.gl.DEPTH_TEST);
	}

	render(camera){
		this.gl.clearColor(0, 0, 0, 1);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
		this.gl.clear(this.gl.DEPTH_BUFFER_BIT);
		let vpMatrix = camera.getVpMatrix();
		let meshComponents = [];
		for(const root of camera.rootRenderObjects){
			for(const child of root.traverseDown()){
				for(const component of child.getComponentsByType(MeshComponent)){
					this.renderMeshComponent(component, vpMatrix);
				}
			}
		}
	}

	renderMeshComponent(component, vpMatrix){
		let mesh = component.mesh;
		let materials = component.materials;

		mesh.updateBuffersGl(this.gl);

		for(const material of materials){
			//todo: only init necessary materials
			material.compileShader(this.gl);
			let shader = material.shader;

			const positionAttrib = shader.getAttribLocation("aVertexPosition");
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.positionBuffer);
			this.gl.vertexAttribPointer(positionAttrib, 3, this.gl.FLOAT, false, 0, 0);
			this.gl.enableVertexAttribArray(positionAttrib);

			shader.use();

			let mvpMatrix = Mat4.multiplyMatrices(component.entity.worldMatrix, vpMatrix);
			shader.uniformMatrix4fv("uMvpMatrix", mvpMatrix);
			this.gl.drawElements(this.gl.TRIANGLES, 36, this.gl.UNSIGNED_SHORT, mesh.indexBuffer)
		}
	}

	getImageBitmap(){
		return self.createImageBitmap(this.canvas);
	}
}
