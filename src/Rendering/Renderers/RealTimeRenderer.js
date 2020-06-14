import {Renderer, Mat4, ComponentTypes, defaultComponentTypeManager, Mesh} from "../../index.js";

defaultComponentTypeManager.registerComponentType(ComponentTypes.camera, {
	properties: {
		fov: {
			defaultValue: 70,
		},
		clipNear: {
			defaultValue: 0.01,
			min: 0,
		},
		clipFar: {
			defaultValue: 1000,
			min: 0,
		},
		aspect: {
			defaultValue: 1,
		},
		autoUpdateProjectionMatrix: {
			type: "bool",
			defaultValue: true,
		},
		projectionMatrix: {
			type: "mat4",
		},
		// autoManageRootRenderEntities: {
		// 	type: "bool",
		// 	defaultValue: true,
		// },
		// rootRenderEntities: {
		// 	type: "array",
		// }
	},
}, defaultComponentTypeManager.defaultNamespace);

defaultComponentTypeManager.registerComponentType(ComponentTypes.mesh, {
	properties: {
		mesh: {
			type: "asset",
		},
		materials: {
			type: "array",
			arrayTypeOpts: {
				type: "asset",
				assetType: "material",
			}
		},
	},
}, defaultComponentTypeManager.defaultNamespace);

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
		if(camera.autoUpdateProjectionMatrix){
			camera.projectionMatrix = Mat4.createDynamicAspectProjection(camera.fov, camera.clipNear, camera.clipFar, camera.aspect);
		}
		const vpMatrix = Mat4.multiplyMatrices(camera.entity.worldMatrix.inverse(), camera.projectionMatrix);
		let meshComponents = [];
		const rootRenderEntities = [camera.entity.getRoot()];
		//TODO: don't get root every frame, only when changed
		//see state of CameraComponent.js in commit 5d2efa1
		for(const root of rootRenderEntities){
			for(const child of root.traverseDown()){
				for(const component of child.getComponentsByType(ComponentTypes.mesh)){
					this.renderMeshComponent(component, vpMatrix);
				}
			}
		}
	}

	renderMeshComponent(component, vpMatrix){
		let mesh = component.mesh;
		let materials = component.materials;
		if(!mesh || !materials || !materials.length) return;

		mesh.uploadToWebGl(this.gl);

		for(const material of materials){
			if(!material) continue;
			//todo: only init necessary materials
			material.compileShader(this.gl);
			let shader = material.shader;

			const positionAttrib = shader.getAttribLocation("aVertexPosition");
			const positionBuffer = mesh.getBuffer(Mesh.AttributeTypes.position);
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer.glBuffer);
			this.gl.vertexAttribPointer(positionAttrib, positionBuffer.componentCount, this.gl.FLOAT, false, 0, 0);
			this.gl.enableVertexAttribArray(positionAttrib);

			shader.use();

			let mvpMatrix = Mat4.multiplyMatrices(component.entity.worldMatrix, vpMatrix);
			shader.uniformMatrix4fv("uMvpMatrix", mvpMatrix);
			const indexBuffer = mesh.getBuffer(Mesh.AttributeTypes.index);
			this.gl.drawElements(this.gl.TRIANGLES, 36, this.gl.UNSIGNED_SHORT, indexBuffer.glBuffer)
		}
	}

	getImageBitmap(){
		return self.createImageBitmap(this.canvas);
	}
}
