import { Mat4 } from "../../../math/Mat4.js";
import { Renderer } from "../Renderer.js";
import { WebGlRendererDomTarget } from "./WebGlRendererDomTarget.js";
import { WebGlRendererError } from "./WebGlRendererError.js";
import { MeshComponent } from "../../../components/builtIn/MeshComponent.js";
import { WebGlMaterialMapType } from "./WebGlMaterialMapType.js";
import { CachedMaterialData } from "./CachedMaterialData.js";
import { CustomMaterialData } from "../../CustomMaterialData.js";
import { CachedMeshData } from "./CachedMeshData.js";
import { MultiKeyWeakMap } from "../../../util/MultiKeyWeakMap.js";
import { Mesh } from "../../../core/Mesh.js";
import { CachedProgramData } from "./CachedProgramData.js";

/**
 * @extends {Renderer<WebGlRendererDomTarget>}
 */
export class WebGlRenderer extends Renderer {
	static get domTargetConstructor() {
		return WebGlRendererDomTarget;
	}

	#isInit = false;

	/** @type {HTMLCanvasElement?} */
	#canvas = null;
	/** @type {WebGLRenderingContext?} */
	#gl = null;
	getWebGlContext() {
		if (!this.#gl) {
			if (this.#isInit) {
				throw new Error("Assertion failed: webgl context lost");
			} else {
				throw new Error("Assertion failed: webgl context not initialized");
			}
		}
		return this.#gl;
	}

	/** @type {Set<WebGlRendererDomTarget>} */
	#domTargets = new Set();

	/** @type {WeakMap<import("../../Material.js").Material, CachedMaterialData>} */
	#cachedMaterialData = new WeakMap();

	/** @type {WeakMap<WebGLProgram, CachedProgramData>} */
	#cachedProgramData = new WeakMap();

	/** @type {WeakMap<import("../../../core/Mesh.js").Mesh, CachedMeshData>} */
	#cachedMeshDatas = new WeakMap();

	/** @type {MultiKeyWeakMap<[number, import("../../ShaderSource.js").ShaderSource], WebGLShader>} */
	#cachedShaders = new MultiKeyWeakMap([], { allowNonObjects: true });

	/** @type {MultiKeyWeakMap<[import("../../ShaderSource.js").ShaderSource, import("../../ShaderSource.js").ShaderSource], WebGLProgram>} */
	#cachedPrograms = new MultiKeyWeakMap();

	/** @type {OES_element_index_uint?} */
	#uint32IndexFormatExtension = null;

	/** @type {number?} */
	#currentCullMode = null;
	#cullFaceEnabled = false;

	#blendingEnabled = false;
	#currentBlendSrcRgb = null;
	#currentBlendDstRgb = null;
	#currentBlendSrcAlpha = null;
	#currentBlendDstAlpha = null;

	/**
	 * This is a helper type for registering callbacks on CustomMaterialData and should not be called on the renderer directly.
	 * Calling this directly will lead to runtime errors.
	 *
	 * ## Usage
	 * ```js
	 * const renderer = new WebGlRenderer();
	 * const customData = new CustomMaterialData();
	 * myMaterial.setProperty("customData", customData);
	 * customData.registerCallback(renderer, (gl, location) => {
	 *
	 * });
	 * ```
	 */
	_customMaterialDataSignature = /** @type {(gl: WebGLRenderingContext, location: WebGLUniformLocation) => void} */ (/** @type {unknown} */ (null));

	constructor() {
		super();

		// key: Material, value: object with WebGlShaders etc.
		this.cachedMaterialData = new WeakMap();

		// key: ShaderSource, value: WeakMap of (ShaderSource, WebGlShader)
		this.cachedShaders = new WeakMap();

		// key: WebGlShader, value: Set of WeakRefs that contains the object this shader is used by
		this.shadersUsedByLists = new WeakMap();
	}

	async init() {
		this.#canvas = document.createElement("canvas");
		this.#gl = this.#canvas.getContext("webgl");
		if (!this.#gl) {
			throw new WebGlRendererError("not-supported", "Failed to get WebGL context.");
		}
		this.#isInit = true;
	}

	/**
	 * @override
	 */
	createDomTarget() {
		const domTarget = super.createDomTarget();
		this.#domTargets.add(domTarget);
		domTarget.onResize(() => {
			if (!this.#canvas) return;
			let width = 1;
			let height = 1;
			for (const target of this.#domTargets) {
				width = Math.max(width, target.width);
				height = Math.max(height, target.height);
			}
			if (this.#canvas.width != width) {
				this.#canvas.width = width;
			}
			if (this.#canvas.height != height) {
				this.#canvas.height = height;
			}
		});
		return domTarget;
	}

	/**
	 * @override
	 * @param {WebGlRendererDomTarget} domTarget
	 * @param {import("../../../components/builtIn/CameraComponent.js").CameraComponent} camera
	 */
	render(domTarget, camera) {
		const gl = this.#gl;
		if (!this.#isInit || !this.#canvas || !gl) return;

		if (camera.autoUpdateAspectRatio) {
			camera.aspectRatio = domTarget.width / domTarget.height;
		}

		camera.updateProjectionMatrixIfEnabled();

		/**
		 * @typedef {object} MeshRenderData
		 * @property {MeshComponent} component
		 * @property {Mat4} worldMatrix
		 */

		if (!camera.entity) return;
		/** @type {import("../../../core/Entity.js").Entity[]} */
		const rootRenderEntities = [camera.entity.getRoot()];

		// Collect all objects in the scene
		/** @type {MeshRenderData[]} */
		const meshRenderDatas = [];

		// TODO: don't get root every frame, only when changed
		// see state of CameraComponent.js in commit 5d2efa1
		for (const root of rootRenderEntities) {
			for (const child of root.traverseDown()) {
				for (const component of child.getComponents(MeshComponent)) {
					if (!component.mesh || !component.mesh.vertexState) continue;
					const worldMatrix = child.worldMatrix;
					meshRenderDatas.push({ component, worldMatrix });
				}
			}
		}

		const viewMatrix = camera.entity.worldMatrix.inverse();
		const viewProjectionMatrix = Mat4.multiplyMatrices(viewMatrix, camera.projectionMatrix);

		gl.viewport(0, this.#canvas.height - domTarget.height, domTarget.width, domTarget.height);
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LESS);

		/**
		 * @typedef MaterialRenderData
		 * @property {MeshRenderData[]} meshes
		 * @property {import("./WebGlMaterialConfig.js").WebGlMaterialConfig} materialConfig
		 */

		/**
		 * @typedef ProgramRenderData
		 * @property {Map<import("../../Material.js").Material, MaterialRenderData>} materialRenderDatas
		 */

		// Group all meshes by program and material
		/** @type {Map<WebGLProgram, ProgramRenderData>} */
		const programRenderDatas = new Map();
		for (const meshRenderData of meshRenderDatas) {
			if (!meshRenderData.component.mesh || !meshRenderData.component.mesh.vertexState) continue;
			for (const material of meshRenderData.component.materials) {
				if (!material || material.destructed || !material.materialMap) continue; // todo: log a (supressable) warning when the material is destructed

				const materialData = this.#getCachedMaterialData(material);
				const materialConfig = materialData.getMaterialConfig();
				if (!materialConfig || !materialConfig.vertexShader || !materialConfig.fragmentShader) continue;

				const program = this.#getProgram(materialConfig.vertexShader, materialConfig.fragmentShader);

				let programRenderData = programRenderDatas.get(program);
				if (!programRenderData) {
					programRenderData = {
						materialRenderDatas: new Map(),
					};
					programRenderDatas.set(program, programRenderData);
				}

				let materialRenderData = programRenderData.materialRenderDatas.get(material);
				if (!materialRenderData) {
					materialRenderData = {
						meshes: [],
						materialConfig,
					};
					programRenderData.materialRenderDatas.set(material, materialRenderData);
				}

				materialRenderData.meshes.push(meshRenderData);
			}
		}

		// Sort meshes by program render order
		const sortedProgramRenderDatas = Array.from(programRenderDatas.entries());
		// TODO: Users can set the render order on the material config, but we are storing a list of programs.
		// Essentially what we will want to do is store by program AND render order.
		// This will make things less performant, for example, a user could have:
		//  - a material with program A, render order 10
		//  - a material with program B, render order 20
		//  - a material with program A again, render order 30
		// Essentially sandwitching program B between two draw calls with program A.
		// But if the user has specifically requested this render order, we should respect that request.

		// sortedProgramRenderDatas.sort((a, b) => {
		// 	const aConfig = a[1].materialConfig;
		// 	const bConfig = b[1].materialConfig;
		// 	return aConfig.renderOrder - bConfig.renderOrder;
		// });

		for (const [program, programRenderData] of sortedProgramRenderDatas) {
			gl.useProgram(program);

			const programData = this.#getCachedProgramData(program);
			const viewUniformLocations = programData.getViewUniformLocations(gl);
			const modelUniformLocations = programData.getModelUniformLocations(gl);

			if (viewUniformLocations.viewProjectionMatrix) {
				gl.uniformMatrix4fv(viewUniformLocations.viewProjectionMatrix, false, new Float32Array(viewProjectionMatrix.getFlatArrayBuffer("f32").buffer));
			}

			for (const [material, materialRenderData] of programRenderData.materialRenderDatas) {
				const cullModeData = material.getMappedPropertyForMapType(WebGlMaterialMapType, "cullMode");
				const cullMode = cullModeData?.value ?? "back";
				if (cullMode == "front") {
					this.#setCullMode(gl.FRONT);
				} else if (cullMode == "back") {
					this.#setCullMode(gl.BACK);
				} else if (cullMode == "none") {
					this.#setCullMode(null);
				}

				this.#setBlendMode(materialRenderData.materialConfig.blend);

				for (const { mappedData, value } of material.getMappedPropertiesForMapType(WebGlMaterialMapType)) {
					if (mappedData.mappedName == "cullMode") continue;
					if (mappedData.mappedType == "custom") {
						const errorExample = `const customData = new MaterialCustomData();
Material.setProperty("${mappedData.mappedName}", customData)`;
						if (!value) {
							throw new Error(`Assertion failed, material property "${mappedData.mappedName}" expected custom data but no property was set on the material. Set one with:\n${errorExample}`);
						}
						if (!(value instanceof CustomMaterialData)) {
							throw new Error(`Assertion failed, material property "${mappedData.mappedName}" expected custom data but the property was a MaterialCustomData instance. Set custom data with:\n${errorExample}`);
						}
						const location = programData.getMaterialUniformLocation(gl, mappedData.mappedName);
						if (location) {
							value.fireCallback(/** @type {WebGlRenderer} */ (this), gl, location);
						}
					} else {
						throw new Error("Not yet implemented");
					}
				}

				for (const { component: meshComponent, worldMatrix } of materialRenderData.meshes) {
					const mesh = meshComponent.mesh;
					if (!mesh) continue;

					if (modelUniformLocations.mvpMatrix) {
						const mvpMatrix = Mat4.multiplyMatrices(worldMatrix, viewProjectionMatrix);
						gl.uniformMatrix4fv(modelUniformLocations.mvpMatrix, false, new Float32Array(mvpMatrix.getFlatArrayBuffer("f32").buffer));
					}

					const meshData = this.#getCachedMeshData(mesh);
					const indexBufferData = meshData.getIndexBufferData();
					if (indexBufferData) {
						let indexFormat;
						if (mesh.indexFormat == Mesh.IndexFormat.UINT_16) {
							indexFormat = gl.UNSIGNED_SHORT;
						} else if (mesh.indexFormat == Mesh.IndexFormat.UINT_32) {
							if (!this.#uint32IndexFormatExtension) {
								this.#uint32IndexFormatExtension = gl.getExtension("OES_element_index_uint");
							}
							indexFormat = gl.UNSIGNED_INT;
						} else {
							throw new Error(`Mesh has an invalid index format: ${mesh.indexFormat}`);
						}
						gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferData.buffer);

						let i = 0;
						for (const { buffer, attributes, stride } of meshData.getAttributeBufferData()) {
							gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
							for (const { componentCount, type, normalized, offset } of attributes) {
								gl.vertexAttribPointer(i, componentCount, type, normalized, stride, offset);
								gl.enableVertexAttribArray(i);
								i++;
							}
						}

						gl.drawElements(gl.TRIANGLES, indexBufferData.count, indexFormat, 0);
					} else {
						// TODO
					}
				}
			}
		}

		domTarget.drawImage(this.#canvas);
	}

	/**
	 * @param {import("../../Material.js").Material} material
	 */
	#getCachedMaterialData(material) {
		let data = this.#cachedMaterialData.get(material);
		if (!data) {
			data = new CachedMaterialData(material);
			this.#cachedMaterialData.set(material, data);
			material.onDestructor(() => {
				// TODO: delete created WebGLPrograms
			});
		}
		return data;
	}

	/**
	 * @param {WebGLProgram} program
	 */
	#getCachedProgramData(program) {
		let data = this.#cachedProgramData.get(program);
		if (!data) {
			data = new CachedProgramData(program);
			this.#cachedProgramData.set(program, data);
		}
		return data;
	}

	/**
	 * @param {import("../../../core/Mesh.js").Mesh} mesh
	 */
	#getCachedMeshData(mesh) {
		let data = this.#cachedMeshDatas.get(mesh);
		if (!data) {
			data = new CachedMeshData(mesh, this);
			this.#cachedMeshDatas.set(mesh, data);
		}
		return data;
	}

	/**
	 * @param {import("../../ShaderSource.js").ShaderSource} shaderSource
	 * @param {number} type
	 */
	#getShader(shaderSource, type) {
		const existing = this.#cachedShaders.get([type, shaderSource]);
		if (existing) return existing;

		const gl = this.#gl;
		if (!gl) throw new Error("Failed to create WebGL shader: renderer not initialized");

		const shader = gl.createShader(type);
		if (!shader) throw new Error("Failed to create shader");
		gl.shaderSource(shader, shaderSource.source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			throw new Error(`Shader compilation failed: ${gl.getShaderInfoLog(shader)}`);
		}

		this.#cachedShaders.set([type, shaderSource], shader);
		return shader;
	}

	/**
	 * @param {import("../../ShaderSource.js").ShaderSource} vertexShaderSource
	 * @param {import("../../ShaderSource.js").ShaderSource} fragmentShaderSource
	 */
	#getProgram(vertexShaderSource, fragmentShaderSource) {
		const existing = this.#cachedPrograms.get([vertexShaderSource, fragmentShaderSource]);
		if (existing) return existing;

		const gl = this.#gl;
		if (!gl) throw new Error("Failed to create WebGL shader: renderer not initialized");

		const vertexShader = this.#getShader(vertexShaderSource, gl.VERTEX_SHADER);
		const fragmentShader = this.#getShader(fragmentShaderSource, gl.FRAGMENT_SHADER);

		const program = gl.createProgram();
		if (!program) throw new Error("Failed to create program");

		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			throw new Error(`Failed to link shader program: ${gl.getProgramInfoLog(program)}`);
		}

		this.#cachedPrograms.set([vertexShaderSource, fragmentShaderSource], program);
		return program;
	}

	/**
	 * Sets the cull mode of the gl context.
	 * @param {number?} mode gl.FRONT, gl.BACK, gl.FRONT_AND_BACK, or null to disable culling.
	 */
	#setCullMode(mode) {
		const gl = this.getWebGlContext();
		const enabled = mode != null;
		if (enabled != this.#cullFaceEnabled) {
			if (enabled) {
				gl.enable(gl.CULL_FACE);
			} else {
				gl.disable(gl.CULL_FACE);
			}
			this.#cullFaceEnabled = enabled;
		}
		if (enabled) {
			if (mode != this.#currentCullMode) {
				gl.cullFace(mode);
				this.#currentCullMode = mode;
			}
		}
	}

	/**
	 * Sets the blend mode of the gl context.
	 * Set to null to disable blending.
	 * @param {import("./WebGlMaterialConfig.js").WebGlBlendConfig?} config
	 */
	#setBlendMode(config) {
		const gl = this.getWebGlContext();
		const enabled = config != null;
		if (enabled != this.#blendingEnabled) {
			if (enabled) {
				gl.enable(gl.BLEND);
			} else {
				gl.disable(gl.BLEND);
			}
			this.#blendingEnabled = enabled;
		}
		if (enabled) {
			const srcRgb = config.srcFactor;
			const srcAlpha = config.srcFactorAlpha ?? srcRgb;
			const dstRgb = config.dstFactor;
			const dstAlpha = config.dstFactorAlpha ?? dstRgb;
			if (
				srcRgb != this.#currentBlendSrcRgb ||
				srcAlpha != this.#currentBlendSrcAlpha ||
				dstRgb != this.#currentBlendDstRgb ||
				dstAlpha != this.#currentBlendDstAlpha
			) {
				gl.blendFuncSeparate(srcRgb, dstRgb, srcAlpha, dstAlpha);
			}
		}
	}
}
