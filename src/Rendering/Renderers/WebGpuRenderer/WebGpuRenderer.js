import {Mat4, Vec2, DefaultComponentTypes, defaultComponentTypeManager, Mesh} from "../../../index.js";
import Renderer from "../Renderer.js";
import WebGpuRendererDomTarget from "./WebGpuRendererDomTarget.js";
import WebGpuPipeline from "./WebGpuPipeline.js";
import WebGpuUniformBuffer from "./WebGpuUniformBuffer.js";

export {default as WebGpuPipelineConfiguration} from "./WebGpuPipelineConfiguration.js";
export {default as WebGpuVertexState} from "./WebGpuVertexState.js";

export const materialMapWebGpuTypeUuid = "286eaa41-36ce-4d94-9413-d52fc435b6e5";

export default class WebGpuRenderer extends Renderer{

	static domTargetConstructor = WebGpuRendererDomTarget;

	constructor(){
		super();

		this.isInit = false;

		this.adapter = null;
		this.device = null;
		this.onInitCbs = new Set();

		this.cachedMaterialData = new WeakMap(); //<Material, {cachedData}>
		this.cachedPipelines = new WeakMap(); //<WebGpuPipelineConfiguration, WeakMap<WebGpuVertexState, WebGpuPipeline>>

		//for every pipeline, maintain a list of objects that the pipeline is used by
		this.pipelinesUsedByLists = new WeakMap(); //<WebGpuPipeline, Set[WeakRef]

		this.cachedMeshData = new WeakMap(); //<Mesh, {cachedData}>
	}

	async init(){
		this.adapter = await navigator.gpu.requestAdapter();
		const device = this.device = await this.adapter.requestDevice();

		this.viewUniformsBuffer = new WebGpuUniformBuffer({
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
			uniformOffsets: {
				projectionMatrix: 0,
			},
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

		this.pipelineLayout = device.createPipelineLayout({
			bindGroupLayouts: [
				this.viewUniformsBuffer.bindGroupLayout,
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
			camera.projectionMatrix = Mat4.createDynamicAspectProjection(camera.fov, camera.clipNear, camera.clipFar, camera.aspect);
		}
		const inverseCamMat = camera.entity.worldMatrix.inverse();
		const vpMatrix = Mat4.multiplyMatrices(inverseCamMat, camera.projectionMatrix);

		const collectedDrawObjects = new Map(); //Map<MaterialMap, Map<Material, Set<RenderableComponent>>>

		let meshComponents = [];
		const rootRenderEntities = [camera.entity.getRoot()];
		//TODO: don't get root every frame, only when changed
		//see state of CameraComponent.js in commit 5d2efa1
		for(const root of rootRenderEntities){
			for(const child of root.traverseDown()){
				for(const component of child.getComponentsByType(DefaultComponentTypes.mesh)){
					if(!component.mesh || !component.mesh.vertexState) continue;
					meshComponents.push(component);
				}
			}
		}

		const commandEncoder = this.device.createCommandEncoder();

		const renderPassEncoder = commandEncoder.beginRenderPass(domTarget.getRenderPassDescriptor());

		this.viewUniformsBuffer.resetDynamicOffset();
		this.materialUniformsBuffer.resetDynamicOffset();
		this.objectUniformsBuffer.resetDynamicOffset();

		//todo, only update when something changed
		this.viewUniformsBuffer.appendData(new Vec2(domTarget.width,domTarget.height)); //todo, pass as integer
		this.viewUniformsBuffer.writeToGpu();
		renderPassEncoder.setBindGroup(0, this.viewUniformsBuffer.bindGroup);

		//todo
		renderPassEncoder.setBindGroup(1, this.materialUniformsBuffer.bindGroup);


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
				renderPassEncoder.setPipeline(materialData.forwardPipeline.pipeline);
				renderPassEncoder.setBindGroup(2, this.objectUniformsBuffer.bindGroup, [this.objectUniformsBuffer.currentDynamicOffset]);
				this.objectUniformsBuffer.nextDynamicOffset();
				const mesh = meshComponent.mesh;
				const meshData = this.getCachedMeshData(mesh);
				for(const [i, buffer] of meshData.buffers.entries()){
					renderPassEncoder.setVertexBuffer(i, buffer);
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
			pipeline = new WebGpuPipeline(this.device, pipelineConfiguration, this.pipelineLayout, vertexState);
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
		pipeline.destructor();
		this.pipelinesUsedByLists.delete(pipeline);
	}

	getCachedMeshData(mesh){
		let data = this.cachedMeshData.get(mesh);
		if(!data){
			data = {};
			this.cachedMeshData.set(mesh, data);

			data.buffers = [];
			for(const buffer of mesh.getBuffers()){
				const vertexBuffer = this.device.createBuffer({
					size: buffer.buffer.byteLength,
					usage: GPUBufferUsage.VERTEX,
					mappedAtCreation: true,
				});
				new Uint8Array(vertexBuffer.getMappedRange()).set(new Uint8Array(buffer.buffer));
				vertexBuffer.unmap();
				data.buffers.push(vertexBuffer);
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
}
