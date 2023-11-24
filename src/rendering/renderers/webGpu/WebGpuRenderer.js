import {ENABLE_WEBGPU_CLUSTERED_LIGHTS} from "../../../studioDefines.js";
import {Renderer} from "../Renderer.js";
import {WebGpuRendererDomTarget} from "./WebGpuRendererDomTarget.js";
import {WebGpuChunkedBuffer} from "./bufferHelper/WebGpuChunkedBuffer.js";
import {CachedCameraData} from "./CachedCameraData.js";
import {CachedMeshData} from "./CachedMeshData.js";
import {Mat4} from "../../../math/Mat4.js";
import {Vec2} from "../../../math/Vec2.js";
import {Vec3} from "../../../math/Vec3.js";
import {Vec4} from "../../../math/Vec4.js";
import {LightComponent} from "../../../components/builtIn/LightComponent.js";
import {MeshComponent} from "../../../components/builtIn/MeshComponent.js";
import {Mesh} from "../../../core/Mesh.js";
import {MultiKeyWeakMap} from "../../../util/MultiKeyWeakMap.js";
import {ShaderBuilder} from "../../ShaderBuilder.js";
import {WebGpuMaterialMapType} from "./WebGpuMaterialMapType.js";
import {Texture} from "../../../core/Texture.js";
import {CachedTextureData} from "./CachedTextureData.js";
import {CachedMaterialData} from "./CachedMaterialData.js";
import {Sampler} from "../../Sampler.js";
import {parseVertexInput} from "../../../util/wgslParsing.js";
import {PlaceHolderTextureManager} from "./PlaceHolderTextureManager.js";
import {ShaderSource} from "../../ShaderSource.js";
import {WebGpuRendererError} from "./WebGpuRendererError.js";

export {WebGpuPipelineConfig} from "./WebGpuPipelineConfig.js";
export {WebGpuMaterialMapTypeLoader as MaterialMapTypeLoaderWebGpuRenderer} from "./WebGpuMaterialMapTypeLoader.js";

export const CLUSTER_BOUNDS_SHADER_ASSET_UUID = "892d56b3-df77-472b-93dd-2c9c38ec2f3d";
export const CLUSTER_LIGHTS_SHADER_ASSET_UUID = "a2b8172d-d910-47e9-8d3b-2a8ea3280153";

/**
 * @extends {Renderer<WebGpuRendererDomTarget>}
 */
export class WebGpuRenderer extends Renderer {
	static get domTargetConstructor() {
		return WebGpuRendererDomTarget;
	}

	#placeHolderTextureManager;

	/** @type {FinalizationRegistry<CachedMaterialData>} */
	#cachedMaterialDataRegistry = new FinalizationRegistry(heldValue => {
		heldValue.destructor();
	});

	/**
	 * @param {import("../../../assets/EngineAssetsManager.js").EngineAssetsManager} engineAssetManager
	 */
	constructor(engineAssetManager) {
		super();

		this.engineAssetManager = engineAssetManager;

		this.maxLights = 512;

		this.adapter = null;
		this.device = null;
		this.viewBindGroupLayout = null;
		this.lightsBuffer = null;
		if (ENABLE_WEBGPU_CLUSTERED_LIGHTS) {
			this.computeClusterBoundsBindGroupLayout = null;
			this.computeClusterLightsBindGroupLayout = null;
			this.computeClusterBoundsShaderCode = null;
			this.computeClusterLightsShaderCode = null;
		}
		this.viewUniformsBuffer = null;
		this.materialUniformsBuffer = null;
		this.objectUniformsBuffer = null;

		this.#placeHolderTextureManager = new PlaceHolderTextureManager(this);

		this.isInit = false;
		/** @type {Set<() => void>} */
		this.onInitCbs = new Set();

		/** @type {WeakMap<import("../../../components/builtIn/CameraComponent.js").CameraComponent, CachedCameraData>} */
		this.cachedCameraData = new WeakMap();

		/** @type {WeakMap<import("../../Material.js").Material, CachedMaterialData>} */
		this.cachedMaterialData = new WeakMap();

		/** @type {MultiKeyWeakMap<*[], GPURenderPipeline>} */
		this.cachedPipelines = new MultiKeyWeakMap([], {allowNonObjects: true});

		/** @type {WeakMap<Mesh, CachedMeshData>} */
		this.cachedMeshData = new WeakMap();

		/** @type {MultiKeyWeakMap<unknown[], GPUShaderModule>} */
		this.cachedShaderModules = new MultiKeyWeakMap();

		/** @private @type {WeakMap<Texture, CachedTextureData>} */
		this.cachedTextureData = new WeakMap();
	}

	async init() {
		if (!("gpu" in navigator)) {
			throw new WebGpuRendererError("not-supported", "The WebGPU api is not supported in this browser.");
		}
		this.adapter = await navigator.gpu.requestAdapter();
		if (!this.adapter) {
			throw new WebGpuRendererError("no-adapter-available", "No GPU adapter was available at this time.");
		}
		const device = await this.adapter.requestDevice();
		this.device = device;

		this.viewBindGroupLayout = device.createBindGroupLayout({
			label: "viewBindGroupLayout",
			entries: [
				{
					binding: 0, // view uniforms
					visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
					buffer: {},
				},
				{
					binding: 1, // lights
					visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
					buffer: {type: "storage"},
				},
				{
					binding: 2, // cluster light indices
					visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
					buffer: {type: "storage"},
				},
			],
		});

		this.lightsBuffer = new WebGpuChunkedBuffer({
			device,
			label: "lights",
			bindGroupLength: 2048,
			chunkSize: 2048,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});

		if (ENABLE_WEBGPU_CLUSTERED_LIGHTS) {
			this.computeClusterBoundsBindGroupLayout = device.createBindGroupLayout({
				label: "computeClusterBoundsBindGroupLayout",
				entries: [
					{
						binding: 0, // cluster bounds buffer
						visibility: GPUShaderStage.COMPUTE,
						buffer: {type: "storage"},
					},
				],
			});

			this.computeClusterLightsBindGroupLayout = device.createBindGroupLayout({
				label: "computeClusterLightsBindGroupLayout",
				entries: [
					{
						binding: 0, // cluster bounds buffer
						visibility: GPUShaderStage.COMPUTE,
						buffer: {type: "storage"},
					},
				],
			});

			await this.engineAssetManager.watchAsset(CLUSTER_BOUNDS_SHADER_ASSET_UUID, {
				assertionOptions: {
					assertInstanceType: ShaderSource,
				},
			}, asset => {
				this.computeClusterBoundsShaderCode = asset;
			});
			await this.engineAssetManager.watchAsset(CLUSTER_LIGHTS_SHADER_ASSET_UUID, {
				assertionOptions: {
					assertInstanceType: ShaderSource,
				},
			}, asset => {
				this.computeClusterLightsShaderCode = asset;
			});
		}

		this.viewUniformsBuffer = new WebGpuChunkedBuffer({
			device,
			label: "viewUniforms",
			bindGroupLayout: this.viewBindGroupLayout,
		});

		this.materialUniformsBuffer = new WebGpuChunkedBuffer({
			device,
			label: "materialUniforms",
		});

		this.objectUniformsBindGroupLayout = device.createBindGroupLayout({
			label: "objectUniformsBufferBindGroupLayout",
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.VERTEX,
					buffer: {
						type: "uniform",
						hasDynamicOffset: true,
					},
				},
			],
		});

		this.objectUniformsBuffer = new WebGpuChunkedBuffer({
			device,
			label: "objectUniforms",
			bindGroupLayout: this.objectUniformsBindGroupLayout,
			chunkSize: 65536,
		});

		this.placeHolderSampler = device.createSampler({
			label: "default sampler",
			magFilter: "linear",
			minFilter: "linear",
		});

		this.isInit = true;
		for (const cb of this.onInitCbs) {
			cb();
		}
		this.onInitCbs.clear();
	}

	async waitForInit() {
		if (this.isInit) return;
		/** @type {Promise<void>} */
		const promise = new Promise(r => this.onInitCbs.add(r));
		await promise;
	}

	createDomTarget() {
		const domTarget = super.createDomTarget();
		this.configureSwapChainAsync(domTarget);
		return domTarget;
	}

	/**
	 * @param {import("./WebGpuRendererDomTarget.js").WebGpuRendererDomTarget} domTarget
	 */
	async configureSwapChainAsync(domTarget) {
		await this.waitForInit();
		domTarget.gpuReady();
	}

	/**
	 * @override
	 * @param {WebGpuRendererDomTarget} domTarget
	 * @param {import("../../../components/builtIn/CameraComponent.js").CameraComponent} camera
	 */
	render(domTarget, camera) {
		if (!this.isInit) return;
		if (!domTarget.ready || !domTarget.swapChainFormat) return;
		if (!this.device || !this.viewUniformsBuffer || !this.lightsBuffer || !this.materialUniformsBuffer || !this.objectUniformsBuffer || !this.objectUniformsBindGroupLayout || !this.placeHolderSampler) {
			// All these objects should exist when this.isInit is true, which we already checked for above.
			throw new Error("Assertion failed, some required objects do not exist");
		}

		if (camera.autoUpdateAspectRatio) {
			camera.aspectRatio = domTarget.width / domTarget.height;
		}

		camera.updateProjectionMatrixIfEnabled();
		if (camera.renderOutputConfig) {
			domTarget.setRenderOutputConfig(camera.renderOutputConfig);
		}
		const outputConfig = domTarget.outputConfig;

		/**
		 * @typedef {object} MeshRenderData
		 * @property {MeshComponent} component
		 * @property {Mat4} worldMatrix
		 */

		// Collect all objects in the scene
		/** @type {MeshRenderData[]} */
		const meshRenderDatas = [];
		/** @type {LightComponent[]} */
		const lightComponents = [];
		if (!camera.entity) return;
		/** @type {import("../../../core/Entity.js").Entity[]} */
		const rootRenderEntities = [camera.entity.getRoot()];
		// TODO: don't get root every frame, only when changed
		// see state of CameraComponent.js in commit 5d2efa1
		for (const root of rootRenderEntities) {
			for (const child of root.traverseDown()) {
				for (const component of child.getComponents(MeshComponent)) {
					if (!component.mesh || !component.mesh.vertexState) continue;
					const worldMatrix = child.worldMatrix;
					meshRenderDatas.push({component, worldMatrix});
				}
				for (const component of child.getComponents(LightComponent)) {
					lightComponents.push(component);
				}
			}
		}

		const commandEncoder = this.device.createCommandEncoder({
			label: "default command encoder",
		});

		this.viewUniformsBuffer.resetEntryLocation();
		this.lightsBuffer.resetEntryLocation();
		this.materialUniformsBuffer.resetEntryLocation();
		this.objectUniformsBuffer.resetEntryLocation();

		const viewMatrix = camera.entity.worldMatrix.inverse();
		const vpMatrix = Mat4.multiplyMatrices(viewMatrix, camera.projectionMatrix);
		const inverseProjectionMatrix = camera.projectionMatrix.inverse();

		// todo, only update when something changed
		this.viewUniformsBuffer.appendData(new Vec4(domTarget.width, domTarget.height, 0, 0));
		this.viewUniformsBuffer.appendData(camera.entity.pos);
		this.viewUniformsBuffer.skipBytes(4);
		this.viewUniformsBuffer.appendData(camera.projectionMatrix);
		this.viewUniformsBuffer.appendData(inverseProjectionMatrix);
		this.viewUniformsBuffer.appendData(viewMatrix);
		this.viewUniformsBuffer.appendData(new Vec4(camera.clipNear, camera.clipFar));

		this.viewUniformsBuffer.writeAllChunksToGpu();

		const cameraData = this.getCachedCameraData(camera);
		if (ENABLE_WEBGPU_CLUSTERED_LIGHTS && cameraData.clusterComputeManager) {
			const success = cameraData.clusterComputeManager.computeLightIndices(commandEncoder);
			if (!success) return;
		}

		this.lightsBuffer.appendData(lightComponents.length, "u32");
		this.lightsBuffer.skipBytes(12);
		for (const light of lightComponents) {
			if (!light.entity) continue;
			this.lightsBuffer.appendData(light.entity.worldPos);
			this.lightsBuffer.skipBytes(4);
			this.lightsBuffer.appendData(light.color.clone().multiplyScalar(light.intensity));
			this.lightsBuffer.skipBytes(4);
		}
		this.lightsBuffer.writeAllChunksToGpu();

		const renderPassDescriptor = domTarget.getRenderPassDescriptor();
		if (!renderPassDescriptor) {
			// This should only be null if domTarget.ready is false, which we already
			// checked at the start of this function.
			throw new Error("Assertion failed, renderPassDescriptor does not exist");
		}
		const renderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
		const viewBindGroup = cameraData.getViewBindGroup();
		if (!viewBindGroup) {
			throw new Error("Assertion failed, failed to create view bind group for camera");
		}
		renderPassEncoder.setBindGroup(0, viewBindGroup);

		/**
		 * @typedef PipelineRenderData
		 * @property {Map<import("../../Material.js").Material, MeshRenderData[]>} materialRenderDatas
		 * @property {import("./WebGpuPipelineConfig.js").WebGpuPipelineConfig} forwardPipelineConfig
		 */

		// Group all meshes by pipeline and material
		/** @type {Map<GPURenderPipeline, PipelineRenderData>} */
		const pipelineRenderDatas = new Map();
		for (const renderData of meshRenderDatas) {
			if (!renderData.component.mesh || !renderData.component.mesh.vertexState) continue;
			for (const material of renderData.component.materials) {
				if (!material || material.destructed || !material.materialMap) continue; // todo: log a (supressable) warning when the material is destructed

				const materialData = this.getCachedMaterialData(material);
				const forwardPipelineConfig = materialData.getForwardPipelineConfig();
				if (!forwardPipelineConfig || !forwardPipelineConfig.vertexShader || !forwardPipelineConfig.fragmentShader) continue;
				const pipelineLayout = materialData.getPipelineLayout();
				if (!pipelineLayout) continue;
				const forwardPipeline = this.getPipeline(forwardPipelineConfig, pipelineLayout, renderData.component.mesh.vertexState, domTarget.swapChainFormat, outputConfig, camera.clusteredLightsConfig);

				let pipelineRenderData = pipelineRenderDatas.get(forwardPipeline);
				if (!pipelineRenderData) {
					pipelineRenderData = {
						materialRenderDatas: new Map(),
						forwardPipelineConfig,
					};
					pipelineRenderDatas.set(forwardPipeline, pipelineRenderData);
				}

				let renderDatas = pipelineRenderData.materialRenderDatas.get(material);
				if (!renderDatas) {
					renderDatas = [];
					pipelineRenderData.materialRenderDatas.set(material, renderDatas);
				}
				renderDatas.push(renderData);
			}
		}

		// Sort meshes by pipeline
		const sortedPipelineRenderDatas = Array.from(pipelineRenderDatas.entries());
		sortedPipelineRenderDatas.sort((a, b) => {
			const aConfig = a[1].forwardPipelineConfig;
			const bConfig = b[1].forwardPipelineConfig;
			return aConfig.renderOrder - bConfig.renderOrder;
		});

		for (const [pipeline, pipelineRenderData] of sortedPipelineRenderDatas) {
			renderPassEncoder.setPipeline(pipeline);

			for (const [material, renderDatas] of pipelineRenderData.materialRenderDatas) {
				/** @type {GPUBindGroupEntry[]} */
				const bindGroupEntries = [];
				bindGroupEntries.push(this.materialUniformsBuffer.getCurrentChunk().createBindGroupEntry({
					binding: bindGroupEntries.length,
				}));

				const materialData = this.getCachedMaterialData(material);
				/** @type {Set<import("./PlaceHolderTextureReference.js").PlaceHolderTextureReference>} */
				const placeHolderTextureRefs = new Set();

				for (let {mappedData, value} of material.getMappedPropertiesForMapType(WebGpuMaterialMapType)) {
					if (mappedData.mappedType == "texture2d") {
						/** @type {GPUTextureView | null} */
						let textureView = null;
						if (value instanceof Texture) {
							const textureData = this.getCachedTextureData(value);
							const view = textureData.createView();
							if (view) textureView = view;
						}
						if (!textureView) {
							/** @type {number[]} */
							let color;
							if (Array.isArray(value)) {
								color = value;
							} else if (value instanceof Vec2 || value instanceof Vec3 || value instanceof Vec4) {
								color = value.toArray();
							} else {
								color = [0, 0, 0];
							}
							const texture = this.#placeHolderTextureManager.getTexture(color);
							textureView = texture.view;
							const ref = texture.getReference();
							placeHolderTextureRefs.add(ref);
						}
						bindGroupEntries.push({
							binding: bindGroupEntries.length,
							resource: textureView,
						});
					} else if (mappedData.mappedType == "sampler") {
						if (value != null && !(value instanceof Sampler)) {
							throw new Error(`Assertion failed, material property "${mappedData.mappedName}" is not a sampler`);
						}
						let sampler = this.placeHolderSampler;
						if (value) {
							sampler = this.device.createSampler(value.descriptor);
						}
						bindGroupEntries.push({
							binding: bindGroupEntries.length,
							resource: sampler,
						});
					} else {
						if (value instanceof Texture) {
							throw new Error(`Assertion failed, material property "${mappedData.mappedName}" is a texture`);
						}
						if (value instanceof Sampler) {
							throw new Error(`Assertion failed, material property "${mappedData.mappedName}" is a sampler`);
						}
						if (value === null) value = 0;
						this.materialUniformsBuffer.appendData(value, "f32");
					}
				}

				for (const ref of materialData.placeHolderTextureRefs) {
					ref.destructor();
				}
				materialData.placeHolderTextureRefs = placeHolderTextureRefs;

				const uniformsBindGroupLayout = materialData.getUniformsBindGroupLayout();
				if (!uniformsBindGroupLayout) {
					throw new Error("Assertion failed, material doesn't have a uniformsBindGroupLayout.");
				}
				const {bindGroup, dynamicOffset} = this.materialUniformsBuffer.getCurrentEntryLocation(uniformsBindGroupLayout, bindGroupEntries);
				renderPassEncoder.setBindGroup(1, bindGroup, [dynamicOffset]);

				for (const {component: meshComponent, worldMatrix} of renderDatas) {
					const mesh = meshComponent.mesh;
					if (!mesh) continue;
					const entries = [this.objectUniformsBuffer.getCurrentChunk().createBindGroupEntry({binding: 0})];
					const {bindGroup, dynamicOffset} = this.objectUniformsBuffer.getCurrentEntryLocation(this.objectUniformsBindGroupLayout, entries);
					renderPassEncoder.setBindGroup(2, bindGroup, [dynamicOffset]);
					const meshData = this.getCachedMeshData(mesh);
					for (const {index, gpuBuffer, newBufferData} of meshData.getVertexBufferGpuCommands()) {
						if (newBufferData) {
							this.device.queue.writeBuffer(gpuBuffer, 0, newBufferData);
						}
						renderPassEncoder.setVertexBuffer(index, gpuBuffer);
					}
					const indexBufferData = meshData.getIndexedBufferGpuCommands();
					if (indexBufferData) {
						/** @type {GPUIndexFormat?} */
						let indexFormat = null;
						if (mesh.indexFormat == Mesh.IndexFormat.UINT_16) {
							indexFormat = "uint16";
						} else if (mesh.indexFormat == Mesh.IndexFormat.UINT_32) {
							indexFormat = "uint32";
						} else {
							throw new Error(`Mesh has an invalid index format: ${mesh.indexFormat}`);
						}
						renderPassEncoder.setIndexBuffer(indexBufferData, indexFormat);
						renderPassEncoder.drawIndexed(mesh.indexCount, 1, 0, 0, 0);
					} else {
						renderPassEncoder.draw(mesh.vertexCount, 1, 0, 0);
					}

					const mvpMatrix = Mat4.multiplyMatrices(worldMatrix, vpMatrix);
					this.objectUniformsBuffer.appendMatrix(mvpMatrix);
					this.objectUniformsBuffer.appendMatrix(vpMatrix);
					this.objectUniformsBuffer.appendMatrix(worldMatrix);
					this.objectUniformsBuffer.nextEntryLocation();
				}
				this.materialUniformsBuffer.nextEntryLocation();
			}
		}
		this.materialUniformsBuffer.writeAllChunksToGpu();
		this.objectUniformsBuffer.writeAllChunksToGpu();

		renderPassEncoder.end();

		this.device.queue.submit([commandEncoder.finish()]);
	}

	/**
	 * @param {import("../../../components/builtIn/CameraComponent.js").CameraComponent} camera
	 */
	getCachedCameraData(camera) {
		let data = this.cachedCameraData.get(camera);
		if (!data) {
			data = new CachedCameraData(camera, this);
			this.cachedCameraData.set(camera, data);
		}
		return data;
	}

	/**
	 * @param {import("../../Material.js").Material} material
	 */
	getCachedMaterialData(material) {
		let data = this.cachedMaterialData.get(material);
		if (!data) {
			data = new CachedMaterialData(this, material);
			this.cachedMaterialData.set(material, data);
			this.#cachedMaterialDataRegistry.register(material, data, material);
			const dataRef = data;
			material.onDestructor(() => {
				this.#cachedMaterialDataRegistry.unregister(material);
				dataRef.destructor();
			});
		}
		return data;
	}

	/**
	 * @param {import("./WebGpuPipelineConfig.js").WebGpuPipelineConfig} pipelineConfig
	 * @param {GPUPipelineLayout} pipelineLayout
	 * @param {import("../../VertexState.js").VertexState} vertexState
	 * @param {GPUTextureFormat} outputFormat
	 * @param {import("../../RenderOutputConfig.js").RenderOutputConfig} outputConfig
	 * @param {import("../../ClusteredLightsConfig.js").ClusteredLightsConfig?} clusteredLightsConfig
	 */
	getPipeline(pipelineConfig, pipelineLayout, vertexState, outputFormat, outputConfig, clusteredLightsConfig) {
		if (!pipelineConfig.vertexShader) {
			throw new Error("Failed to create pipeline, pipeline config has no vertex shader");
		}
		if (!pipelineConfig.fragmentShader) {
			throw new Error("Failed to create pipeline, pipeline config has no fragment shader");
		}
		if (!this.isInit || !this.device) {
			throw new Error("Renderer is not initialized");
		}
		/** @type {*[]} */
		const keys = [outputFormat, outputConfig, vertexState, pipelineConfig, pipelineLayout];
		if (ENABLE_WEBGPU_CLUSTERED_LIGHTS && clusteredLightsConfig) {
			keys.push(clusteredLightsConfig);
		}
		let pipeline = this.cachedPipelines.get(keys);
		if (!pipeline) {
			let vertexModule;
			let fragmentModule;
			if (ENABLE_WEBGPU_CLUSTERED_LIGHTS) {
				vertexModule = this.getCachedShaderModule(pipelineConfig.vertexShader, {clusteredLightsConfig});
				fragmentModule = this.getCachedShaderModule(pipelineConfig.fragmentShader, {clusteredLightsConfig});
			} else {
				vertexModule = this.getCachedShaderModule(pipelineConfig.vertexShader);
				fragmentModule = this.getCachedShaderModule(pipelineConfig.fragmentShader);
			}

			const vertexInputs = parseVertexInput(pipelineConfig.vertexShader.source);
			/** @type {import("../../VertexState.js").PreferredShaderLocation[]} */
			const preferredShaderLocations = [];
			for (const {identifier, location} of vertexInputs) {
				const attributeTypeStr = identifier.toLocaleUpperCase();
				// @ts-ignore TODO: better attribute type enums
				const attributeType = Mesh.AttributeType[attributeTypeStr];
				preferredShaderLocations.push({
					attributeType,
					location,
				});
			}

			pipeline = this.device.createRenderPipeline({
				// todo: add better label
				label: "Material Pipeline",
				layout: pipelineLayout,
				vertex: {
					module: vertexModule,
					entryPoint: "main",
					...vertexState.getDescriptor({
						preferredShaderLocations,
					}),
				},
				primitive: {
					topology: pipelineConfig.primitiveTopology,
				},
				depthStencil: {
					format: outputConfig.depthStencilFormat,
					depthCompare: pipelineConfig.depthCompareFunction,
					depthWriteEnabled: pipelineConfig.depthWriteEnabled,
				},
				multisample: {
					count: outputConfig.multisampleCount,
				},
				fragment: {
					module: fragmentModule,
					entryPoint: "main",
					targets: [
						{
							format: outputFormat,
							blend: pipelineConfig.blend,
						},
					],
				},
			});
			this.cachedPipelines.set(keys, pipeline);
		}
		return pipeline;
	}

	/**
	 * @param {Mesh} mesh
	 */
	getCachedMeshData(mesh) {
		let data = this.cachedMeshData.get(mesh);
		if (!data) {
			data = new CachedMeshData(mesh, this);
			this.cachedMeshData.set(mesh, data);
		}
		return data;
	}

	/**
	 * @param {import("../../ShaderSource.js").ShaderSource} shaderSource
	 */
	getCachedShaderModule(shaderSource, {
		clusteredLightsConfig = /** @type {import("../../ClusteredLightsConfig.js").ClusteredLightsConfig?} */ (null),
	} = {}) {
		/** @type {unknown[]} */
		const keys = [shaderSource];
		if (ENABLE_WEBGPU_CLUSTERED_LIGHTS && clusteredLightsConfig) {
			keys.push(clusteredLightsConfig);
		}
		let data = this.cachedShaderModules.get(keys);
		if (!data) {
			let code;
			if (ENABLE_WEBGPU_CLUSTERED_LIGHTS && clusteredLightsConfig) {
				code = ShaderBuilder.fillShaderDefines(shaderSource.source, clusteredLightsConfig.getShaderDefines());
			} else {
				code = shaderSource.source;
			}
			if (!this.device) {
				throw new Error("Assertion failed, gpu device is not initialized");
			}
			data = this.device.createShaderModule({code});
			this.cachedShaderModules.set(keys, data);
		}
		return data;
	}

	/**
	 * @param {Texture} texture
	 */
	getCachedTextureData(texture) {
		let data = this.cachedTextureData.get(texture);
		if (!data) {
			data = new CachedTextureData(this, texture);
			this.cachedTextureData.set(texture, data);
		}
		return data;
	}

	/**
	 * Useful for debugging storage buffers but probably pretty slow.
	 * Buffer should have GPUBufferUsage.COPY_SRC at creation.
	 * @param {GPUBuffer} gpuBuffer
	 * @param {number} bufferSize
	 */
	async inspectBuffer(gpuBuffer, bufferSize) {
		if (!this.device) {
			throw new Error("Assertion failed, gpu device is not initialized");
		}
		const readBuffer = this.device.createBuffer({
			label: gpuBuffer.label + "-inspectorCopy",
			size: bufferSize,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
		});
		const commandEncoder = this.device.createCommandEncoder({
			label: "inspectBufferCommandEncoder",
		});
		commandEncoder.copyBufferToBuffer(gpuBuffer, 0, readBuffer, 0, bufferSize);
		const gpuCommands = commandEncoder.finish();
		this.device.queue.submit([gpuCommands]);

		await readBuffer.mapAsync(GPUMapMode.READ);
		return readBuffer.getMappedRange();
	}
}
