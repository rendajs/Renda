// @ts-nocheck

import {Mesh} from "../../core/Mesh.js";
import {MeshAttributeBuffer} from "../../core/MeshAttributeBuffer.js";
import {Mat4} from "../../math/Mat4.js";
import {WebGlShader} from "../WebGlShader.js";
import {Renderer} from "./Renderer.js";

export class WebGlRenderer extends Renderer {
	static materialMapWebGlTypeUuid = "392a2a4e-c895-4245-9c6d-d6259b8e5267";

	constructor() {
		super();

		this.canvas = null;
		this.gl = null;

		// key: Material, value: object with WebGlShaders etc.
		this.cachedMaterialData = new WeakMap();

		// key: ShaderSource, value: WeakMap of (ShaderSource, WebGlShader)
		this.cachedShaders = new WeakMap();

		// key: WebGlShader, value: Set of WeakRefs that contains the object this shader is used by
		this.shadersUsedByLists = new WeakMap();
	}

	async init() {
		this.canvas = document.createElement("canvas");
		this.canvas.width = 300;
		this.canvas.height = 300;
		this.gl = this.canvas.getContext("webgl");
		this.gl.enable(this.gl.DEPTH_TEST);
	}

	render(camera) {
		this.gl.clearColor(0, 0, 0, 1);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
		this.gl.clear(this.gl.DEPTH_BUFFER_BIT);
		if (camera.autoUpdateProjectionMatrix) {
			camera.projectionMatrix = Mat4.createDynamicAspectPerspective(camera.fov, camera.clipNear, camera.clipFar, camera.aspect);
		}
		const vpMatrix = Mat4.multiplyMatrices(camera.entity.worldMatrix.inverse(), camera.projectionMatrix);
		const rootRenderEntities = [camera.entity.getRoot()];
		// TODO: don't get root every frame, only when changed
		// see state of CameraComponent.js in commit 5d2efa1
		for (const root of rootRenderEntities) {
			for (const child of root.traverseDown()) {
				for (const component of child.getComponents(DefaultComponentTypes.mesh)) {
					this.renderMeshComponent(component, vpMatrix);
				}
			}
		}
	}

	renderMeshComponent(component, vpMatrix) {
		const mesh = component.mesh;
		const materials = component.materials;
		if (!mesh || !materials || !materials.length) return;

		mesh.uploadToWebGl(this.gl);

		for (const material of materials) {
			if (!material || material.destructed) continue;

			const webGlMapData = material.customMapDatas.get(WebGlRenderer.materialMapWebGlTypeUuid);
			const materialData = this.getCachedMaterialData(material);
			if (!materialData.forwardShader) {
				materialData.forwardShader = this.getShader(webGlMapData.vertexShader, webGlMapData.fragmentShader);
				this.addUsedByObjectToShader(materialData.forwardShader, material);
			}
			const shader = materialData.forwardShader;

			// todo: make attribute management more scalable

			const positionAttrib = shader.getAttribLocation("aVertexPosition");
			const positionBuffer = mesh.getBuffer(Mesh.AttributeType.POSITION);
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer.glBuffer);
			this.gl.vertexAttribPointer(positionAttrib, positionBuffer.componentCount, this.attribTypeToWebGlConst(positionBuffer.componentType), false, 0, 0);
			this.gl.enableVertexAttribArray(positionAttrib);

			const normalAttrib = shader.getAttribLocation("aVertexNormal");
			if (normalAttrib >= 0) {
				const normalBuffer = mesh.getBuffer(Mesh.AttributeType.NORMAL);
				if (normalBuffer) {
					this.gl.bindBuffer(this.gl.ARRAY_BUFFER, normalBuffer.glBuffer);
					this.gl.vertexAttribPointer(normalAttrib, normalBuffer.componentCount, this.attribTypeToWebGlConst(positionBuffer.componentType), false, 0, 0);
					this.gl.enableVertexAttribArray(normalAttrib);
				}
			}

			shader.use();

			const mvpMatrix = Mat4.multiplyMatrices(component.entity.worldMatrix, vpMatrix);
			shader.uniformMatrix4fv("uMvpMatrix", mvpMatrix);
			const indexBuffer = mesh.getBuffer(Mesh.AttributeType.INDEX);
			this.gl.drawElements(this.gl.TRIANGLES, 36, this.attribTypeToWebGlConst(indexBuffer.componentType), indexBuffer.glBuffer);
		}
	}

	getCachedMaterialData(material) {
		let data = this.cachedMaterialData.get(material);
		if (!data) {
			data = {};
			this.cachedMaterialData.set(material, data);
		}
		return data;
	}

	getShader(vertSourceAsset, fragSourceAsset) {
		let shader;
		let cachedFragList = this.cachedShaders.get(vertSourceAsset);
		if (cachedFragList) {
			shader = cachedFragList.get(fragSourceAsset);
		}

		if (!shader) {
			shader = new WebGlShader(this, vertSourceAsset, fragSourceAsset);
			shader.compile();

			if (!cachedFragList) {
				cachedFragList = new WeakMap();
				this.cachedShaders.set(vertSourceAsset, cachedFragList);
			}
			cachedFragList.set(fragSourceAsset, shader);
		}
		return shader;
	}

	disposeMaterial(material) {
		const materialData = this.getCachedMaterialData(material);
		this.cachedMaterialData.delete(material);
		this.removeUsedByObjectFromShader(materialData.forwardShader, material);
	}

	addUsedByObjectToShader(shader, usedBy) {
		let usedByList = this.shadersUsedByLists.get(shader);
		if (!usedByList) {
			usedByList = new Set();
			this.shadersUsedByLists.set(shader, usedByList);
		}
		usedByList.add(new WeakRef(usedBy));
	}

	removeUsedByObjectFromShader(shader, usedBy) {
		const usedByList = this.shadersUsedByLists.get(shader);
		if (usedByList) {
			for (const ref of usedByList) {
				const deref = ref.deref();
				if (usedBy == deref || deref === undefined) {
					usedByList.delete(ref);
				}
			}
		}

		if (!usedByList || usedByList.size == 0) {
			this.disposeShader(shader);
			this.shadersUsedByLists.delete(shader);
		}
	}

	disposeShader(shader) {
		shader.destructor();
		this.shadersUsedByLists.delete(shader);
	}

	attribTypeToWebGlConst(type) {
		switch (type) {
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
			default:
				throw new Error("Unknown component type");
		}
	}

	// todo:
	// getImageBitmap(){
	// 	return self.createImageBitmap(this.canvas);
	// }
}
