import {Renderer, WebGlShader, ShaderSource, Mat4, ComponentTypes, defaultComponentTypeManager, Mesh, Material, MeshAttributeBuffer} from "../../index.js";

defaultComponentTypeManager.registerComponentType(ComponentTypes.camera, {
	properties: {
		fov: {
			defaultValue: 70,
		},
		clipNear: {
			defaultValue: 0.01,
			guiOpts: {
				min: 0,
			},
		},
		clipFar: {
			defaultValue: 1000,
			guiOpts: {
				min: 0,
			}
		},
		aspect: {
			defaultValue: 1,
		},
		autoUpdateProjectionMatrix: {
			defaultValue: true,
		},
		projectionMatrix: {
			type: Mat4,
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
			type: Mesh,
		},
		materials: {
			type: Array,
			arrayOpts: {
				type: Material,
			},
		},
	},
}, defaultComponentTypeManager.defaultNamespace);

export default class WebGlRenderer extends Renderer{

	static materialMapWebGlTypeUuid = "392a2a4e-c895-4245-9c6d-d6259b8e5267";

	constructor(){
		super();

		this.canvas = null;
		this.gl = null;

		//key: Material, value: object with WebGlShaders etc.
		this.cachedMaterialData = new WeakMap();

		//key: ShaderSource, value: WeakMap of (ShaderSource, WebGlShader)
		this.cachedShaders = new WeakMap();

		//key: WebGlShader, value: Set of WeakRefs that contains the object this shader is used by
		this.shadersUsedByLists = new WeakMap();
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
			if(!material || material.disposed) continue;

			const webGlMapData = material.customMapDatas.get(WebGlRenderer.materialMapWebGlTypeUuid);
			const materialData = this.getCachedMaterialData(material);
			if(!materialData.forwardShader){
				materialData.forwardShader = this.getShader(material, webGlMapData.vertexShader, webGlMapData.fragmentShader);
			}
			const shader = materialData.forwardShader;

			const positionAttrib = shader.getAttribLocation("aVertexPosition");
			const positionBuffer = mesh.getBuffer(Mesh.AttributeTypes.POSITION);
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer.glBuffer);
			this.gl.vertexAttribPointer(positionAttrib, positionBuffer.componentCount, this.attribTypeToWebGlConst(positionBuffer.componentType), false, 0, 0);
			this.gl.enableVertexAttribArray(positionAttrib);

			shader.use();

			let mvpMatrix = Mat4.multiplyMatrices(component.entity.worldMatrix, vpMatrix);
			shader.uniformMatrix4fv("uMvpMatrix", mvpMatrix);
			const indexBuffer = mesh.getBuffer(Mesh.AttributeTypes.INDEX);
			this.gl.drawElements(this.gl.TRIANGLES, 36, this.attribTypeToWebGlConst(indexBuffer.componentType), indexBuffer.glBuffer)
		}
	}

	getCachedMaterialData(material){
		let data = this.cachedMaterialData.get(material);
		if(!data){
			data = {};
			this.cachedMaterialData.set(material, data);
		}
		return data;
	}

	getShader(usedByMaterial, vertSourceAsset, fragSourceAsset){
		let shader;
		let cachedFragList = this.cachedShaders.get(vertSourceAsset);
		if(cachedFragList){
			shader = cachedFragList.get(fragSourceAsset);
		}

		if(!shader){
			shader = new WebGlShader(this, vertSourceAsset, fragSourceAsset);
			shader.compile();

			if(!cachedFragList){
				cachedFragList = new WeakMap();
				this.cachedShaders.set(vertSourceAsset, cachedFragList);
			}
			cachedFragList.set(fragSourceAsset, shader);
		}

		this.addUsedByObjectToShader(shader, usedByMaterial);

		return shader;
	}

	disposeMaterial(material){
		material.markDisposed();
		const materialData = this.getCachedMaterialData(material);
		this.cachedMaterialData.delete(material);
		this.removeUsedByObjectFromShader(materialData.forwardShader, material);
	}

	addUsedByObjectToShader(shader, usedBy){
		let usedByList = this.shadersUsedByLists.get(shader);
		if(!usedByList){
			usedByList = new Set();
			this.shadersUsedByLists.set(shader, usedByList);
		}
		usedByList.add(new WeakRef(usedBy));
	}

	removeUsedByObjectFromShader(shader, usedBy){
		const usedByList = this.shadersUsedByLists.get(shader);
		if(usedByList){
			for(const ref of usedByList){
				const deref = ref.deref();
				if(usedBy == deref || deref === undefined){
					usedByList.delete(ref);
				}
			}
		}

		if(!usedByList || usedByList.size == 0){
			this.disposeShader(shader);
		}
	}

	disposeShader(shader){
		shader.destructor();
		this.shadersUsedByLists.delete(shader);
	}

	attribTypeToWebGlConst(type){
		switch(type){
			case MeshAttributeBuffer.ComponentTypes.BYTE:
				return this.gl.BYTE;
			case MeshAttributeBuffer.ComponentTypes.SHORT:
				return this.gl.SHORT;
			case MeshAttributeBuffer.ComponentTypes.UNSIGNED_BYTE:
				return this.gl.UNSIGNED_BYTE;
			case MeshAttributeBuffer.ComponentTypes.UNSIGNED_SHORT:
				return this.gl.UNSIGNED_SHORT;
			case MeshAttributeBuffer.ComponentTypes.FLOAT:
				return this.gl.FLOAT;
			case MeshAttributeBuffer.ComponentTypes.HALF_FLOAT:
				return this.gl.HALF_FLOAT;
		}
	}

	getImageBitmap(){
		return self.createImageBitmap(this.canvas);
	}
}
