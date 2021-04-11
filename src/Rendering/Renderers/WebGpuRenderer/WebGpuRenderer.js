import {Mat4, Vec4, DefaultComponentTypes, defaultComponentTypeManager, Mesh} from "../../../index.js";
import Renderer from "../Renderer.js";
import WebGpuRendererDomTarget from "./WebGpuRendererDomTarget.js";
import WebGpuUniformBuffer from "./WebGpuUniformBuffer.js";
import WebGpuCachedCameraData from "./WebGpuCachedCameraData.js";

export {default as WebGpuPipelineConfiguration} from "./WebGpuPipelineConfiguration.js";
export {default as WebGpuVertexState} from "./WebGpuVertexState.js";

export const materialMapWebGpuTypeUuid = "286eaa41-36ce-4d94-9413-d52fc435b6e5";

export default class WebGpuRenderer extends Renderer{

	static domTargetConstructor = WebGpuRendererDomTarget;

	constructor(){
		super();

		this.maxLights = 512;

		this.isInit = false;

		this.adapter = null;
		this.device = null;
		this.onInitCbs = new Set();

		this.cachedCameraData = new WeakMap();
		this.cachedMaterialData = new WeakMap(); //<Material, {cachedData}>
		this.cachedPipelines = new WeakMap(); //<WebGpuPipelineConfiguration, WeakMap<WebGpuVertexState, WebGpuPipeline>>

		//for every pipeline, maintain a list of objects that the pipeline is used by
		this.pipelinesUsedByLists = new WeakMap(); //<WebGpuPipeline, Set[WeakRef]

		this.cachedMeshData = new WeakMap(); //<Mesh, {cachedData}>

		this.computeClusterBoundsPipeline = null;
		this.computeClusterLightsBindGroupLayout = null;
	}

	async init(){
		this.adapter = await navigator.gpu.requestAdapter();
		const device = this.device = await this.adapter.requestDevice();

		this.viewBindGroupLayout = device.createBindGroupLayout({
			entries: [
				{
					binding: 0, //view uniforms
					visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
					buffer: {},
				},
				{
					binding: 1, //lights
					visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
					buffer: {type: "read-only-storage"},
				},
			],
		});

		this.lightsBuffer = new WebGpuUniformBuffer({
			device,
			bindGroupLength: 2048,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});

		this.computeClusterBoundsBindGroupLayout = device.createBindGroupLayout({
			entries: [
				{
					binding: 0, //cluster bounds buffer
					visibility: GPUShaderStage.COMPUTE,
					buffer: {type: "storage"},
				},
			],
		});

		this.computeClusterLightsBindGroupLayout = device.createBindGroupLayout({
			entries: [
				{
					binding: 0, //cluster bounds buffer
					visibility: GPUShaderStage.COMPUTE,
					buffer: {type: "storage"},
				},
				{
					binding: 1, //cluster lights buffer
					visibility: GPUShaderStage.COMPUTE,
					buffer: {type: "storage"},
				},
			],
		});

		this.viewUniformsBuffer = new WebGpuUniformBuffer({
			device,
			bindGroupLayout: this.viewBindGroupLayout,
		});

		this.materialUniformsBuffer = new WebGpuUniformBuffer({
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

		this.objectUniformsBuffer = new WebGpuUniformBuffer({
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
					}
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
		for(const cb of this.onInitCbs){
			cb();
		}
		this.onInitCbs.clear();
	}

	async waitForInit(){
		if(this.isInit) return;
		await new Promise(r => this.onInitCbs.add(r));
	}

	createDomTarget(){
		const domTarget = super.createDomTarget();
		this.configureSwapChainAsync(domTarget);
		return domTarget;
	}

	async configureSwapChainAsync(domTarget){
		await this.waitForInit();
		domTarget.gpuReady();
	}

	render(domTarget, camera){
		if(!this.isInit) return;
		if(!domTarget.ready) return;

		//todo, support for auto cam aspect based on domTarget size

		if(camera.autoUpdateProjectionMatrix){
			camera.projectionMatrix = Mat4.createDynamicAspectPerspective(camera.fov, camera.clipNear, camera.clipFar, camera.aspect);
		}
		const collectedDrawObjects = new Map(); //Map<MaterialMap, Map<Material, Set<RenderableComponent>>>

		const meshComponents = [];
		const lightComponents = [];
		const rootRenderEntities = [camera.entity.getRoot()];
		//TODO: don't get root every frame, only when changed
		//see state of CameraComponent.js in commit 5d2efa1
		for(const root of rootRenderEntities){
			for(const child of root.traverseDown()){
				for(const component of child.getComponentsByType(DefaultComponentTypes.mesh)){
					if(!component.mesh || !component.mesh.vertexState) continue;
					meshComponents.push(component);
				}
				for(const component of child.getComponentsByType(DefaultComponentTypes.light)){
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

		//todo, only update when something changed
		this.viewUniformsBuffer.appendData(new Vec4(domTarget.width,domTarget.height, 0, 0)); //todo, pass as integer
		this.viewUniformsBuffer.appendData(camera.projectionMatrix);
		this.viewUniformsBuffer.appendData(inverseProjectionMatrix);

		this.viewUniformsBuffer.writeToGpu();

		const cameraData = this.getCachedCameraData(camera);
		cameraData.clusterSetup.computeBounds(commandEncoder);
		cameraData.clusterSetup.computeLightIndices(commandEncoder);

		for(const light of lightComponents){
			this.lightsBuffer.appendData(light.entity.pos);
			this.lightsBuffer.appendScalar(0); //todo: make this prettier
			this.lightsBuffer.appendData(light.color);
			this.lightsBuffer.nextBufferOffset(32);
		}
		this.lightsBuffer.writeToGpu();

		const renderPassEncoder = commandEncoder.beginRenderPass(domTarget.getRenderPassDescriptor());
		renderPassEncoder.setBindGroup(0, cameraData.viewBindGroup);
		renderPassEncoder.setBindGroup(1, this.materialUniformsBufferBindGroup); //todo

		for(const [i, meshComponent] of meshComponents.entries()){
			const mvpMatrix = Mat4.multiplyMatrices(meshComponent.entity.worldMatrix, vpMatrix);
			this.objectUniformsBuffer.appendData(mvpMatrix);
			this.objectUniformsBuffer.appendData(vpMatrix);
			this.objectUniformsBuffer.appendData(meshComponent.entity.worldMatrix);

			//todo: group all materials in the current view and render them all grouped
			for(const material of meshComponent.materials){
				if(!material || material.destructed) continue;
				const materialData = this.getCachedMaterialData(material);
				if(!materialData.forwardPipeline){
					const mapData = material.customMapDatas.get(materialMapWebGpuTypeUuid);
					materialData.forwardPipeline = this.getPipeline(mapData.forwardPipelineConfiguration, meshComponent.mesh.vertexState);
					this.addUsedByObjectToPipeline(materialData.forwardPipeline, material);
				}
				renderPassEncoder.setPipeline(materialData.forwardPipeline);
				renderPassEncoder.setBindGroup(2, this.objectUniformsBufferBindGroup, [this.objectUniformsBuffer.currentBufferOffset]);
				this.objectUniformsBuffer.nextBufferOffset();
				const mesh = meshComponent.mesh;
				const meshData = this.getCachedMeshData(mesh);
				for(const [i, bufferData] of meshData.buffers.entries()){
					if(bufferData.bufferDirty){
						this.device.queue.writeBuffer(bufferData.gpuBuffer, 0, bufferData.meshBuffer.buffer);
						bufferData.bufferDirty = false;
					}
					renderPassEncoder.setVertexBuffer(i, bufferData.gpuBuffer);
				}
				if(meshData.indexBuffer){
					let indexFormat = null;
					if(mesh.indexFormat == Mesh.IndexFormat.UINT_16){
						indexFormat = "uint16";
					}else if(mesh.indexFormat == Mesh.IndexFormat.UINT_32){
						indexFormat = "uint32";
					}
					renderPassEncoder.setIndexBuffer(meshData.indexBuffer, indexFormat);
					renderPassEncoder.drawIndexed(mesh.indexLength, 1, 0, 0, 0);
				}else{
					renderPassEncoder.draw(mesh.vertexCount, 1, 0, 0);
				}
			}
		}
		this.objectUniformsBuffer.writeToGpu();


		renderPassEncoder.endPass();

		this.device.queue.submit([commandEncoder.finish()]);
	}

	getCachedCameraData(camera){
		let data = this.cachedCameraData.get(camera);
		if(!data){
			data = new WebGpuCachedCameraData(camera, this);
			this.cachedCameraData.set(camera, data);
		}
		return data;
	}

	getCachedMaterialData(material){
		let data = this.cachedMaterialData.get(material);
		if(!data){
			data = {};
			this.cachedMaterialData.set(material, data);
			material.onDestructor(_ => {
				this.disposeMaterial(material);
			});
		}
		return data;
	}

	getPipeline(pipelineConfiguration, vertexState){
		let vertexStateList = this.cachedPipelines.get(pipelineConfiguration);
		if(!vertexStateList){
			vertexStateList = new WeakMap(); //<WebGpuVertexState, WebGpuPipeline>
			this.cachedPipelines.set(pipelineConfiguration, vertexStateList);
		}
		let pipeline = vertexStateList.get(vertexState);
		if(!pipeline){
			pipeline = this.device.createRenderPipeline({
				layout: this.pipelineLayout,
				vertex: {
					module: this.device.createShaderModule({
						code: pipelineConfiguration.vertexShader.source,
					}),
					entryPoint: "main",
					...vertexState.getDescriptor(),
				},
				primitive: {
					topology: pipelineConfiguration.primitiveTopology,
				},
				depthStencil: {
					format: "depth24plus-stencil8",
					depthCompare: "less",
					depthWriteEnabled: true,
				},
				multisample: {
					count: 4,
				},
				fragment: {
					module: this.device.createShaderModule({
						code: pipelineConfiguration.fragmentShader.source,
					}),
					entryPoint: "main",
					targets: [
						{format: "bgra8unorm"},
					],
				},
			});
			vertexStateList.set(vertexState, pipeline);
		}
		return pipeline;
	}

	disposeMaterial(material){
		const materialData = this.getCachedMaterialData(material);
		this.cachedMaterialData.delete(material);
		this.removeUsedByObjectFromPipeline(materialData.forwardPipeline, material);
	}

	addUsedByObjectToPipeline(pipeline, usedBy){
		let usedByList = this.pipelinesUsedByLists.get(pipeline);
		if(!usedByList){
			usedByList = new Set();
			this.pipelinesUsedByLists.set(pipeline, usedByList);
		}
		usedByList.add(new WeakRef(usedBy));
	}

	removeUsedByObjectFromPipeline(pipeline, usedBy){
		if(!pipeline) return;
		const usedByList = this.pipelinesUsedByLists.get(pipeline);
		if(usedByList){
			for(const ref of usedByList){
				const deref = ref.deref();
				if(usedBy == deref || deref === undefined){
					usedByList.delete(ref);
				}
			}
		}

		if(!usedByList || usedByList.size == 0){
			this.disposePipeline(pipeline);
			this.pipelinesUsedByLists.delete(pipeline);
		}
	}

	disposePipeline(pipeline){
		this.pipelinesUsedByLists.delete(pipeline);
	}

	getCachedMeshData(mesh){
		let data = this.cachedMeshData.get(mesh);
		if(!data){
			data = {};
			this.cachedMeshData.set(mesh, data);

			data.buffers = [];
			for(const meshBuffer of mesh.getBuffers(false)){
				const gpuBuffer = this.device.createBuffer({
					size: meshBuffer.buffer.byteLength,
					usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, //todo: only use copy_dst when buffer updates are actually expected
					mappedAtCreation: true,
				});
				new Uint8Array(gpuBuffer.getMappedRange()).set(new Uint8Array(meshBuffer.buffer));
				gpuBuffer.unmap();
				const bufferData = {
					meshBuffer, gpuBuffer,
					bufferDirty: false,
				}
				meshBuffer.onBufferChanged(_ => {
					bufferData.bufferDirty = true;
				});
				data.buffers.push(bufferData);
			}

			if(mesh.indexBuffer){
				const indexBuffer = this.device.createBuffer({
					size: mesh.indexBuffer.byteLength,
					usage: GPUBufferUsage.INDEX,
					mappedAtCreation: true,
				});
				new Uint8Array(indexBuffer.getMappedRange()).set(new Uint8Array(mesh.indexBuffer));
				indexBuffer.unmap();
				data.indexBuffer = indexBuffer;
			}
		}
		return data;
	}

	//useful for debugging storage buffers but probably pretty slow
	//buffer should have GPUBufferUsage.COPY_SRC at creation
	async inspectBuffer(gpuBuffer, bufferSize){
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
