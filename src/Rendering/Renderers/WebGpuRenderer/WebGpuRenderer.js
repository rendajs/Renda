import {Renderer, Mat4, DefaultComponentTypes, defaultComponentTypeManager} from "../../../index.js";
import WebGpuRendererDomTarget from "./WebGpuRendererDomTarget.js";
import WebGpuPipeline from "./WebGpuPipeline.js";

export {default as WebGpuPipelineConfiguration} from "./WebGpuPipelineConfiguration.js";
export {default as WebGpuVertexState} from "./WebGpuVertexState.js";

export default class WebGpuRenderer extends Renderer{

	static materialMapWebGpuTypeUuid = "286eaa41-36ce-4d94-9413-d52fc435b6e5";
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

		const uniformBindGroupLayout = device.createBindGroupLayout({
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.VERTEX,
					type: "uniform-buffer",
					hasDynamicOffset: true,
				},
			],
		});

		this.pipelineLayout = device.createPipelineLayout({
			bindGroupLayouts: [
				uniformBindGroupLayout,
			],
		});

		this.meshRendererUniformsBufferLength = 65536;
		this.meshRendererUniformsBuffer = device.createBuffer({
			size: this.meshRendererUniformsBufferLength,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

		this.uniformBindGroup = device.createBindGroup({
			layout: uniformBindGroupLayout,
			entries: [
				{
					binding: 0,
					resource: {
						buffer: this.meshRendererUniformsBuffer,
						size: 256,
					}
				}
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
		domTarget.configureSwapChain(this.adapter, this.device);
	}

	render(domTarget, camera){
		if(!this.isInit) return;
		if(!domTarget.ready) return;

		if(camera.autoUpdateProjectionMatrix){
			camera.projectionMatrix = Mat4.createDynamicAspectProjection(camera.fov, camera.clipNear, camera.clipFar, camera.aspect);
		}
		const vpMatrix = Mat4.multiplyMatrices(camera.entity.worldMatrix.inverse(), camera.projectionMatrix);

		const collectedDrawObjects = new Map(); //Map<MaterialMap, Map<Material, Set<RenderableComponent>>>

		let meshComponents = [];
		const rootRenderEntities = [camera.entity.getRoot()];
		//TODO: don't get root every frame, only when changed
		//see state of CameraComponent.js in commit 5d2efa1
		for(const root of rootRenderEntities){
			for(const child of root.traverseDown()){
				for(const component of child.getComponentsByType(DefaultComponentTypes.mesh)){
					if(!component.mesh) continue;
					meshComponents.push(component);
				}
			}
		}

		const commandEncoder = this.device.createCommandEncoder();

		const renderPassEncoder = commandEncoder.beginRenderPass(domTarget.getRenderPassDescriptor());

		const uniformsLength = 256;
		const uniformBufferData = new ArrayBuffer(uniformsLength * meshComponents.length);
		const uniformBufferFloatView = new Float32Array(uniformBufferData);
		for(const [i, meshComponent] of meshComponents.entries()){
			let mvpMatrix = Mat4.multiplyMatrices(meshComponent.entity.worldMatrix, vpMatrix);
			uniformBufferFloatView.set(mvpMatrix.getFlatArray(), i*uniformsLength/4);

			for(const material of meshComponent.materials){
				if(!material || material.destructed) continue;
				const materialData = this.getCachedMaterialData(material);
				if(!materialData.forwardPipeline){
					const mapData = material.customMapDatas.get(WebGpuRenderer.materialMapWebGpuTypeUuid);
					materialData.forwardPipeline = this.getPipeline(mapData.forwardPipelineConfiguration, meshComponent.mesh.vertexState);
					this.addUsedByObjectToPipeline(materialData.forwardPipeline, material);
				}
				renderPassEncoder.setPipeline(materialData.forwardPipeline.pipeline);
				renderPassEncoder.setBindGroup(0, this.uniformBindGroup, [i*uniformsLength]);
				const {vertexBuffer} = this.getCachedMeshData(meshComponent.mesh);
				renderPassEncoder.setVertexBuffer(0, vertexBuffer);
				renderPassEncoder.draw(36, 1, 0, 0);
			}
		}
		this.device.defaultQueue.writeBuffer(this.meshRendererUniformsBuffer, 0, uniformBufferData);


		renderPassEncoder.endPass();

		this.device.defaultQueue.submit([commandEncoder.finish()]);
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

			const cubeVertexArray = new Float32Array([
				// float4 position, float4 color, float2 uv,
				1, -1, 1, 1,
				-1, -1, 1, 1,
				-1, -1, -1, 1,
				1, -1, -1, 1,
				1, -1, 1, 1,
				-1, -1, -1, 1,

				1, 1, 1, 1,
				1, -1, 1, 1,
				1, -1, -1, 1,
				1, 1, -1, 1,
				1, 1, 1, 1,
				1, -1, -1, 1,

				-1, 1, 1, 1,
				1, 1, 1, 1,
				1, 1, -1, 1,
				-1, 1, -1, 1,
				-1, 1, 1, 1,
				1, 1, -1, 1,

				-1, -1, 1, 1,
				-1, 1, 1, 1,
				-1, 1, -1, 1,
				-1, -1, -1, 1,
				-1, -1, 1, 1,
				-1, 1, -1, 1,

				1, 1, 1, 1,
				-1, 1, 1, 1,
				-1, -1, 1, 1,
				-1, -1, 1, 1,
				1, -1, 1, 1,
				1, 1, 1, 1,

				1, -1, -1, 1,
				-1, -1, -1, 1,
				-1, 1, -1, 1,
				1, 1, -1, 1,
				1, -1, -1, 1,
				-1, 1, -1, 1,
			]);

			const vertexBuffer = this.device.createBuffer({
				size: cubeVertexArray.byteLength,
				usage: GPUBufferUsage.VERTEX,
				mappedAtCreation: true,
			});
			new Float32Array(vertexBuffer.getMappedRange()).set(cubeVertexArray);
			vertexBuffer.unmap();
			data.vertexBuffer = vertexBuffer;
		}
		return data;
	}
}
