import {ENABLE_WEBGPU_CLUSTERED_LIGHTS} from "../../../engineDefines.js";
import {Renderer} from "../Renderer.js";
import {WebGpuRendererDomTarget} from "./WebGpuRendererDomTarget.js";
import {WebGpuChunkedBuffer} from "./bufferHelper/WebGpuChunkedBuffer.js";
import {CachedCameraData} from "./CachedCameraData.js";
import {CachedMeshData} from "./CachedMeshData.js";
import {Mat4} from "../../../math/Mat4.js";
import {Vec4} from "../../../math/Vec4.js";
import {LightComponent} from "../../../components/builtIn/LightComponent.js";
import {MeshComponent} from "../../../components/builtIn/MeshComponent.js";
import {Mesh} from "../../../core/Mesh.js";
import {MultiKeyWeakMap} from "../../../util/MultiKeyWeakMap.js";
import {ShaderBuilder} from "../../ShaderBuilder.js";
import {WebGpuMaterialMapType} from "./WebGpuMaterialMapType.js";
import {Texture} from "../../../core/Texture.js";

export {WebGpuPipelineConfig} from "./WebGpuPipelineConfig.js";
export {WebGpuMaterialMapTypeLoader as MaterialMapTypeLoaderWebGpuRenderer} from "./WebGpuMaterialMapTypeLoader.js";

/**
 * @typedef {Object} CachedMaterialData
 * @property {import("./WebGpuPipelineConfig.js").WebGpuPipelineConfig?} forwardPipelineConfig
 */

/**
 * @extends {Renderer<WebGpuRendererDomTarget>}
 */
export class WebGpuRenderer extends Renderer {
	static get domTargetConstructor() {
		return WebGpuRendererDomTarget;
	}

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
		this.pipelineLayout = null;

		this.isInit = false;
		this.onInitCbs = new Set();

		/** @type {WeakMap<import("../../../components/builtIn/CameraComponent.js").CameraComponent, CachedCameraData>} */
		this.cachedCameraData = new WeakMap();

		/** @type {WeakMap<import("../../Material.js").Material, CachedMaterialData>} */
		this.cachedMaterialData = new WeakMap();

		/** @type {MultiKeyWeakMap<*[], GPURenderPipeline>} */
		this.cachedPipelines = new MultiKeyWeakMap();

		/** @type {WeakMap<Mesh, CachedMeshData>} */
		this.cachedMeshData = new WeakMap();

		/** @type {MultiKeyWeakMap<unknown[], GPUShaderModule>} */
		this.cachedShaderModules = new MultiKeyWeakMap();
	}

	async init() {
		this.adapter = await navigator.gpu.requestAdapter();
		if (!this.adapter) {
			throw new Error("Unable to get GPU adapter.");
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
					visibility: GPUShaderStage.FRAGMENT,
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
					{
						binding: 1, // cluster lights buffer
						visibility: GPUShaderStage.COMPUTE,
						buffer: {type: "storage"},
					},
				],
			});

			await this.engineAssetManager.watchAsset("892d56b3-df77-472b-93dd-2c9c38ec2f3d", asset => {
				this.computeClusterBoundsShaderCode = asset;
			});
			await this.engineAssetManager.watchAsset("a2b8172d-d910-47e9-8d3b-2a8ea3280153", asset => {
				this.computeClusterLightsShaderCode = asset;
			});
		}

		this.viewUniformsBuffer = new WebGpuChunkedBuffer({
			device,
			label: "viewUniforms",
			bindGroupLayout: this.viewBindGroupLayout,
		});

		this.materialUniformsBindGroupLayout = device.createBindGroupLayout({
			label: "materialUniformsBufferBindGroupLayout",
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
					buffer: {
						type: "uniform",
						hasDynamicOffset: true,
					},
				},
			],
		});

		this.materialUniformsBuffer = new WebGpuChunkedBuffer({
			device,
			label: "materialUniforms",
			bindGroupLayout: this.materialUniformsBindGroupLayout,
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

		this.pipelineLayout = device.createPipelineLayout({
			label: "default pipeline layout",
			bindGroupLayouts: [
				this.viewBindGroupLayout,
				this.materialUniformsBindGroupLayout,
				this.objectUniformsBindGroupLayout,
			],
		});

		this.isInit = true;
		for (const cb of this.onInitCbs) {
			cb();
		}
		this.onInitCbs.clear();
	}

	async waitForInit() {
		if (this.isInit) return;
		await new Promise(r => this.onInitCbs.add(r));
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
		if (!domTarget.ready) return;
		if (!this.device || !this.viewUniformsBuffer || !this.lightsBuffer || !this.materialUniformsBuffer || !this.objectUniformsBuffer) {
			// All these objects should exist when this.isInit is true, which we already checked for above.
			throw new Error("Assertion failed, some required objects do not exist");
		}

		// todo, support for auto cam aspect based on domTarget size

		camera.updateProjectionMatrixIfEnabled();
		if (camera.renderOutputConfig) {
			domTarget.setRenderOutputConfig(camera.renderOutputConfig);
		}
		const outputConfig = domTarget.outputConfig;

		/**
		 * @typedef {Object} MeshRenderData
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
		this.viewUniformsBuffer.appendData(new Vec4(domTarget.width, domTarget.height, 0, 0)); // todo, pass as integer?
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
			this.lightsBuffer.appendData(light.entity.pos);
			this.lightsBuffer.skipBytes(4);
			this.lightsBuffer.appendData(light.color);
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
				if (!materialData.forwardPipelineConfig) {
					const webgpuMap = material.materialMap.getMapTypeInstance(WebGpuMaterialMapType);
					if (!webgpuMap) continue;
					materialData.forwardPipelineConfig = webgpuMap.forwardPipelineConfig;
					// this.addUsedByObjectToPipeline(materialData.forwardPipeline, material);
				}
				if (!materialData.forwardPipelineConfig || !materialData.forwardPipelineConfig.vertexShader || !materialData.forwardPipelineConfig.fragmentShader) continue;
				const forwardPipeline = this.getPipeline(materialData.forwardPipelineConfig, renderData.component.mesh.vertexState, outputConfig, camera.clusteredLightsConfig);

				let pipelineRenderData = pipelineRenderDatas.get(forwardPipeline);
				if (!pipelineRenderData) {
					pipelineRenderData = {
						materialRenderDatas: new Map(),
						forwardPipelineConfig: materialData.forwardPipelineConfig,
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
				const {bindGroup, dynamicOffset} = this.materialUniformsBuffer.getCurrentEntryLocation();
				renderPassEncoder.setBindGroup(1, bindGroup, [dynamicOffset]);
				for (let [, value] of material.getMappedPropertiesForMapType(WebGpuMaterialMapType)) {
					if (value === null) value = 0;
					if (value instanceof Texture) {
						// TODO
					} else {
						this.materialUniformsBuffer.appendData(value, "f32");
					}
				}

				for (const {component: meshComponent, worldMatrix} of renderDatas) {
					const mesh = meshComponent.mesh;
					if (!mesh) continue;
					const {bindGroup, dynamicOffset} = this.objectUniformsBuffer.getCurrentEntryLocation();
					renderPassEncoder.setBindGroup(2, bindGroup, [dynamicOffset]);
					const meshData = this.getCachedMeshData(mesh);
					for (const {index, gpuBuffer, newBufferData} of meshData.getBufferGpuCommands()) {
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
			data = {
				forwardPipelineConfig: null,
			};
			this.cachedMaterialData.set(material, data);
		}
		return data;
	}

	/**
	 * @param {import("./WebGpuPipelineConfig.js").WebGpuPipelineConfig} pipelineConfig
	 * @param {import("../../VertexState.js").VertexState} vertexState
	 * @param {import("../../RenderOutputConfig.js").RenderOutputConfig} outputConfig
	 * @param {import("../../ClusteredLightsConfig.js").ClusteredLightsConfig?} clusteredLightsConfig
	 */
	getPipeline(pipelineConfig, vertexState, outputConfig, clusteredLightsConfig) {
		if (!pipelineConfig.vertexShader) {
			throw new Error("Failed to create pipeline, pipeline config has no vertex shader");
		}
		if (!pipelineConfig.fragmentShader) {
			throw new Error("Failed to create pipeline, pipeline config has no fragment shader");
		}
		if (!this.isInit || !this.device || !this.pipelineLayout) {
			throw new Error("Renderer is not initialized");
		}
		/** @type {*[]} */
		const keys = [outputConfig, vertexState, pipelineConfig];
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
			pipeline = this.device.createRenderPipeline({
				// todo: add better label
				label: "Material Pipeline",
				layout: this.pipelineLayout,
				vertex: {
					module: vertexModule,
					entryPoint: "main",
					...vertexState.getDescriptor(),
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
					targets: outputConfig.fragmentTargets,
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
