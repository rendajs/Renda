import {ENABLE_WEBGPU_CLUSTERED_LIGHTS} from "../../../engineDefines.js";
import Renderer from "../Renderer.js";
import WebGpuRendererDomTarget from "./WebGpuRendererDomTarget.js";
import WebGpuBufferHelper from "./WebGpuBufferHelper.js";
import CachedCameraData from "./CachedCameraData.js";
import CachedMeshData from "./CachedMeshData.js";
import defaultEngineAssetsManager from "../../../Assets/defaultEngineAssetsManager.js";
import Mat4 from "../../../Math/Mat4.js";
import Vec4 from "../../../Math/Vec4.js";
import {LightComponent, MeshComponent} from "../../../Components/Components.js";
import Mesh from "../../../Core/Mesh.js";
import MultiKeyWeakMap from "../../../Util/MultiKeyWeakMap.js";
import ShaderBuilder from "../../ShaderBuilder.js";

export {default as WebGpuPipelineConfig} from "./WebGpuPipelineConfig.js";
export {default as MaterialMapTypeLoaderWebGpuRenderer} from "./MaterialMapTypeLoaderWebGpuRenderer.js";

export const materialMapWebGpuTypeUuid = "286eaa41-36ce-4d94-9413-d52fc435b6e5";

export default class WebGpuRenderer extends Renderer {
	static get domTargetConstructor() {
		return WebGpuRendererDomTarget;
	}

	constructor() {
		super();

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
		this.materialUniformsBufferBindGroup = null;
		this.objectUniformsBuffer = null;
		this.objectUniformsBufferBindGroup = null;
		this.pipelineLayout = null;

		this.isInit = false;
		this.onInitCbs = new Set();

		this.cachedCameraData = new WeakMap();
		this.cachedMaterialData = new WeakMap(); // <Material, {cachedData}>
		this.cachedPipelines = new MultiKeyWeakMap(); // <[WebGpuPipelineConfig, VertexState], WebGpuPipeline>

		// (legacy) for every pipeline, maintain a list of objects that the pipeline is used by
		// this.pipelinesUsedByLists = new WeakMap(); //<WebGpuPipeline, Set[WeakRef]

		this.cachedMeshData = new WeakMap();

		this.cachedShaderModules = new MultiKeyWeakMap(); // <[ShaderSource, clusteredLightsConfig], GPUShaderModule>;
	}

	async init() {
		this.adapter = await navigator.gpu.requestAdapter();
		const device = await this.adapter.requestDevice();
		this.device = device;

		this.viewBindGroupLayout = device.createBindGroupLayout({
			entries: [
				{
					binding: 0, // view uniforms
					visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
					buffer: {},
				},
				{
					binding: 1, // lights
					visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
					buffer: {type: "read-only-storage"},
				},
				{
					binding: 2, // cluster light indices
					visibility: GPUShaderStage.FRAGMENT,
					buffer: {type: "storage"},
				},
			],
		});

		this.lightsBuffer = new WebGpuBufferHelper({
			device,
			bindGroupLength: 2048,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});

		if (ENABLE_WEBGPU_CLUSTERED_LIGHTS) {
			this.computeClusterBoundsBindGroupLayout = device.createBindGroupLayout({
				entries: [
					{
						binding: 0, // cluster bounds buffer
						visibility: GPUShaderStage.COMPUTE,
						buffer: {type: "storage"},
					},
				],
			});

			this.computeClusterLightsBindGroupLayout = device.createBindGroupLayout({
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

			await defaultEngineAssetsManager.watchAsset("892d56b3-df77-472b-93dd-2c9c38ec2f3d", asset => {
				this.computeClusterBoundsShaderCode = asset;
			});
			await defaultEngineAssetsManager.watchAsset("a2b8172d-d910-47e9-8d3b-2a8ea3280153", asset => {
				this.computeClusterLightsShaderCode = asset;
			});
		}

		this.viewUniformsBuffer = new WebGpuBufferHelper({
			device,
			bindGroupLayout: this.viewBindGroupLayout,
		});

		this.materialUniformsBuffer = new WebGpuBufferHelper({
			device,
			bindGroupLayout: device.createBindGroupLayout({
				entries: [
					{
						binding: 0,
						visibility: GPUShaderStage.VERTEX,
						buffer: {},
					},
				],
			}),
		});
		this.materialUniformsBufferBindGroup = this.materialUniformsBuffer.createBindGroup();

		this.objectUniformsBuffer = new WebGpuBufferHelper({
			device,
			bindGroupLayout: device.createBindGroupLayout({
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
			}),
			totalBufferLength: 65536,
		});
		this.objectUniformsBufferBindGroup = this.objectUniformsBuffer.createBindGroup();

		this.pipelineLayout = device.createPipelineLayout({
			bindGroupLayouts: [
				this.viewBindGroupLayout,
				this.materialUniformsBuffer.bindGroupLayout,
				this.objectUniformsBuffer.bindGroupLayout,
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

	async configureSwapChainAsync(domTarget) {
		await this.waitForInit();
		domTarget.gpuReady();
	}

	render(domTarget, camera) {
		if (!this.isInit) return;
		if (!domTarget.ready) return;

		// todo, support for auto cam aspect based on domTarget size

		if (camera.autoUpdateProjectionMatrix) {
			camera.projectionMatrix = Mat4.createDynamicAspectPerspective(camera.fov, camera.clipNear, camera.clipFar, camera.aspect);
		}
		if (camera.renderOutputConfig) {
			domTarget.setRenderOutputConfig(camera.renderOutputConfig);
		}
		const outputConfig = domTarget.outputConfig;

		/** @type {{component: MeshComponent, worldMatrix: Mat4}[]} */
		const meshComponents = [];
		/** @type {LightComponent[]} */
		const lightComponents = [];
		/** @type {import("../../../Core/Entity.js").default[]} */
		const rootRenderEntities = [camera.entity.getRoot()];
		// TODO: don't get root every frame, only when changed
		// see state of CameraComponent.js in commit 5d2efa1
		for (const root of rootRenderEntities) {
			for (const {child, traversedPath} of root.traverseDown()) {
				for (const component of child.getComponents(MeshComponent)) {
					if (!component.mesh || !component.mesh.vertexState) continue;
					const worldMatrix = child.getWorldMatrix(traversedPath);
					meshComponents.push({component, worldMatrix});
				}
				for (const component of child.getComponents(LightComponent)) {
					lightComponents.push(component);
				}
			}
		}

		const commandEncoder = this.device.createCommandEncoder();

		this.viewUniformsBuffer.resetBufferOffset();
		this.lightsBuffer.resetBufferOffset();
		this.materialUniformsBuffer.resetBufferOffset();
		this.objectUniformsBuffer.resetBufferOffset();

		const viewMatrix = camera.entity.worldMatrix.inverse();
		const vpMatrix = Mat4.multiplyMatrices(viewMatrix, camera.projectionMatrix);
		const inverseProjectionMatrix = camera.projectionMatrix.inverse();

		// todo, only update when something changed
		this.viewUniformsBuffer.appendData(new Vec4(domTarget.width, domTarget.height, 0, 0)); // todo, pass as integer?
		this.viewUniformsBuffer.appendData(camera.projectionMatrix);
		this.viewUniformsBuffer.appendData(inverseProjectionMatrix);
		this.viewUniformsBuffer.appendData(viewMatrix);
		this.viewUniformsBuffer.appendData(new Vec4(camera.clipNear, camera.clipFar));

		this.viewUniformsBuffer.writeToGpu();

		const cameraData = this.getCachedCameraData(camera);
		if (ENABLE_WEBGPU_CLUSTERED_LIGHTS) {
			cameraData.clusterComputeManager.computeLightIndices(commandEncoder);
		}

		this.lightsBuffer.appendData(lightComponents.length, "u32");
		this.lightsBuffer.skipBytes(12);
		for (const light of lightComponents) {
			this.lightsBuffer.appendData(light.entity.pos);
			this.lightsBuffer.skipBytes(4);
			this.lightsBuffer.appendData(light.color);
			this.lightsBuffer.skipBytes(4);
		}
		this.lightsBuffer.writeToGpu();

		const renderPassEncoder = commandEncoder.beginRenderPass(domTarget.getRenderPassDescriptor());
		renderPassEncoder.setBindGroup(0, cameraData.getViewBindGroup());
		renderPassEncoder.setBindGroup(1, this.materialUniformsBufferBindGroup); // todo

		for (const {component: meshComponent, worldMatrix} of meshComponents.values()) {
			// todo: group all materials in the current view and render them all grouped
			for (const material of meshComponent.materials) {
				if (!material || material.destructed) continue; // todo: log a (supressable) warning when the material is destructed
				const materialData = this.getCachedMaterialData(material);
				if (!materialData.forwardPipelineConfig) {
					const mapData = material.customMapDatas.get(materialMapWebGpuTypeUuid);
					materialData.forwardPipelineConfig = mapData.forwardPipelineConfig;
					// this.addUsedByObjectToPipeline(materialData.forwardPipeline, material);
				}
				const forwardPipeline = this.getPipeline(materialData.forwardPipelineConfig, meshComponent.mesh.vertexState, outputConfig, camera.clusteredLightsConfig);
				renderPassEncoder.setPipeline(forwardPipeline);
				renderPassEncoder.setBindGroup(2, this.objectUniformsBufferBindGroup, [this.objectUniformsBuffer.currentBufferOffset]);
				const mesh = meshComponent.mesh;
				const meshData = this.getCachedMeshData(mesh);
				for (const {index, gpuBuffer, newBufferData} of meshData.getBufferGpuCommands()) {
					if (newBufferData) {
						this.device.queue.writeBuffer(gpuBuffer, 0, newBufferData);
					}
					renderPassEncoder.setVertexBuffer(index, gpuBuffer);
				}
				const indexBufferData = meshData.getIndexedBufferGpuCommands();
				if (indexBufferData) {
					/** @type {GPUIndexFormat} */
					let indexFormat = null;
					if (mesh.indexFormat == Mesh.IndexFormat.UINT_16) {
						indexFormat = "uint16";
					} else if (mesh.indexFormat == Mesh.IndexFormat.UINT_32) {
						indexFormat = "uint32";
					}
					renderPassEncoder.setIndexBuffer(indexBufferData, indexFormat);
					renderPassEncoder.drawIndexed(mesh.indexLength, 1, 0, 0, 0);
				} else {
					renderPassEncoder.draw(mesh.vertexCount, 1, 0, 0);
				}
			}

			const mvpMatrix = Mat4.multiplyMatrices(worldMatrix, vpMatrix);
			this.objectUniformsBuffer.appendData(mvpMatrix);
			this.objectUniformsBuffer.appendData(vpMatrix);
			this.objectUniformsBuffer.appendData(worldMatrix);
			this.objectUniformsBuffer.nextBufferOffset();
		}
		this.objectUniformsBuffer.writeToGpu();

		renderPassEncoder.endPass();

		this.device.queue.submit([commandEncoder.finish()]);
	}

	getCachedCameraData(camera) {
		let data = this.cachedCameraData.get(camera);
		if (!data) {
			data = new CachedCameraData(camera, this);
			this.cachedCameraData.set(camera, data);
		}
		return data;
	}

	getCachedMaterialData(material) {
		let data = this.cachedMaterialData.get(material);
		if (!data) {
			data = {};
			this.cachedMaterialData.set(material, data);
			material.onDestructor(() => {
				this.disposeMaterial(material);
			});
		}
		return data;
	}

	getPipeline(pipelineConfig, vertexState, outputConfig, clusteredLightsConfig) {
		const keys = [outputConfig, vertexState, pipelineConfig];
		if (ENABLE_WEBGPU_CLUSTERED_LIGHTS && clusteredLightsConfig) {
			keys.push(clusteredLightsConfig);
		}
		let pipeline = this.cachedPipelines.get(keys);
		if (!pipeline) {
			let vertexModule; let fragmentModule;
			if (ENABLE_WEBGPU_CLUSTERED_LIGHTS) {
				vertexModule = this.getCachedShaderModule(pipelineConfig.vertexShader, {clusteredLightsConfig});
				fragmentModule = this.getCachedShaderModule(pipelineConfig.fragmentShader, {clusteredLightsConfig});
			} else {
				vertexModule = this.getCachedShaderModule(pipelineConfig.vertexShader);
				fragmentModule = this.getCachedShaderModule(pipelineConfig.fragmentShader);
			}
			pipeline = this.device.createRenderPipeline({
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
					depthCompare: "less",
					depthWriteEnabled: true,
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

	disposeMaterial(material) {
		// const materialData = this.getCachedMaterialData(material);
		this.cachedMaterialData.delete(material);
		// this.removeUsedByObjectFromPipeline(materialData.forwardPipeline, material);
	}

	// pipelines cannot be disposed by the webgpu spec at the moment,
	// leaving this code here just in case it is needed in the future

	// addUsedByObjectToPipeline(pipeline, usedBy){
	// 	let usedByList = this.pipelinesUsedByLists.get(pipeline);
	// 	if(!usedByList){
	// 		usedByList = new Set();
	// 		this.pipelinesUsedByLists.set(pipeline, usedByList);
	// 	}
	// 	usedByList.add(new WeakRef(usedBy));
	// }

	// removeUsedByObjectFromPipeline(pipeline, usedBy){
	// 	if(!pipeline) return;
	// 	const usedByList = this.pipelinesUsedByLists.get(pipeline);
	// 	if(usedByList){
	// 		for(const ref of usedByList){
	// 			const deref = ref.deref();
	// 			if(usedBy == deref || deref === undefined){
	// 				usedByList.delete(ref);
	// 			}
	// 		}
	// 	}

	// 	if(!usedByList || usedByList.size == 0){
	// 		this.disposePipeline(pipeline);
	// 		this.pipelinesUsedByLists.delete(pipeline);
	// 	}
	// }

	// disposePipeline(pipeline){
	// 	this.pipelinesUsedByLists.delete(pipeline);
	// }

	getCachedMeshData(mesh) {
		let data = this.cachedMeshData.get(mesh);
		if (!data) {
			data = new CachedMeshData(mesh, this);
			this.cachedMeshData.set(mesh, data);
		}
		return data;
	}

	getCachedShaderModule(shaderSource, {
		clusteredLightsConfig = null,
	} = {}) {
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
			data = this.device.createShaderModule({code});
			this.cachedShaderModules.set(keys, data);
		}
		return data;
	}

	// useful for debugging storage buffers but probably pretty slow
	// buffer should have GPUBufferUsage.COPY_SRC at creation
	async inspectBuffer(gpuBuffer, bufferSize) {
		const readBuffer = this.device.createBuffer({
			size: bufferSize,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
		});
		const commandEncoder = this.device.createCommandEncoder();
		commandEncoder.copyBufferToBuffer(gpuBuffer, 0, readBuffer, 0, bufferSize);
		const gpuCommands = commandEncoder.finish();
		this.device.queue.submit([gpuCommands]);

		await readBuffer.mapAsync(GPUMapMode.READ);
		return readBuffer.getMappedRange();
	}
}
