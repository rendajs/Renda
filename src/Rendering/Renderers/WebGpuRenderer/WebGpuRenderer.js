import {Renderer, Mat4, DefaultComponentTypes, defaultComponentTypeManager} from "../../../index.js";
import WebGpuRendererDomTarget from "./WebGpuRendererDomTarget.js";

export default class WebGpuRenderer extends Renderer{

	static materialMapWebGpuTypeUuid = "286eaa41-36ce-4d94-9413-d52fc435b6e5";
	static domTargetConstructor = WebGpuRendererDomTarget;

	constructor(){
		super();

		this.isInit = false;

		this.adapter = null;
		this.device = null;
		this.onInitCbs = new Set();
	}

	async init(){
		this.adapter = await navigator.gpu.requestAdapter();
		const device = this.device = await this.adapter.requestDevice();

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

		const verticesBuffer = device.createBuffer({
			size: cubeVertexArray.byteLength,
			usage: GPUBufferUsage.VERTEX,
			mappedAtCreation: true,
		});
		new Float32Array(verticesBuffer.getMappedRange()).set(cubeVertexArray);
		verticesBuffer.unmap();
		this.cubeVerticesBuffer = verticesBuffer;

		const vertexCode = `
			[[block]] struct Uniforms {
				[[offset(0)]] mvp : mat4x4<f32>;
			};

			[[binding(0), set(0)]] var<uniform> uniforms : Uniforms;

			[[location(0)]] var<in> position : vec4<f32>;

			[[builtin(position)]] var<out> Position : vec4<f32>;
			[[location(0)]] var<out> fragColor : vec4<f32>;

			[[stage(vertex)]]
			fn main() -> void {
				Position = uniforms.mvp * position;
				fragColor = position;
				return;
			}
		`;

		const fragmentCode = `
			[[location(0)]] var<in> fragColor : vec4<f32>;

			[[location(0)]] var<out> outColor : vec4<f32>;

			[[stage(fragment)]]
			fn main() -> void {
				outColor = abs(fragColor);
				return;
			}
		`;

		const uniformBindGroupLayout = device.createBindGroupLayout({
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.VERTEX,
					type: "uniform-buffer",
				},
			],
		});

		const pipelineLayout = device.createPipelineLayout({
			bindGroupLayouts: [
				uniformBindGroupLayout,
			],
		});

		this.basicPipeline = device.createRenderPipeline({
			layout: pipelineLayout,
			vertexStage: {
				module: device.createShaderModule({
					code: vertexCode,
				}),
				entryPoint: "main",
			},
			fragmentStage: {
				module: device.createShaderModule({
					code: fragmentCode,
				}),
				entryPoint: "main",
			},
			primitiveTopology: "triangle-list",
			colorStates: [{
				format: "bgra8unorm",
			}],
			vertexState: {
				vertexBuffers: [
					{
						arrayStride: 16,
						attributes: [
							{
								shaderLocation: 0, //position
								offset: 0,
								format: "float4",
							},
						],
					},
				],
			},
		});

		this.tempMat = new Mat4();

		this.uniformBuffer = device.createBuffer({
			size: 4 * 4 * 4, //32 bit 4x4 matrix
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

		this.uniformBindGroup = device.createBindGroup({
			layout: uniformBindGroupLayout,
			entries: [
				{
					binding: 0,
					resource: {
						buffer: this.uniformBuffer,
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
		domTarget.configureSwapChain(this.device);
	}

	render(domTarget, camera){
		if(!this.isInit) return;
		if(!domTarget.swapChain) return;

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
				for(const component of child.getComponentsByType(DefaultComponentTypes.mesh)){
					meshComponents.push(component);
				}
			}
		}

		const swapChainTextureView = domTarget.swapChain.getCurrentTexture().createView();

		this.device.defaultQueue.writeBuffer(this.uniformBuffer, 0, new Float32Array(vpMatrix.getFlatArray()));

		const commandEncoder = this.device.createCommandEncoder();
		const renderPassEncoder = commandEncoder.beginRenderPass({
			colorAttachments: [{
				attachment: swapChainTextureView,
				loadValue: {r: 0, g: 0.2, b: 0.5, a: 1},
				storeOp: "store",
			}],
			// depthStencilAttachment: {
			// 	attachment: swapChainTextureView,
			// 	depthLoadValue: 1,
			// 	depthStoreOp: "store",
			// 	stencilLoadValue: 1,
			// 	stencilStoreOp: "store",
			// },
		});

		renderPassEncoder.setPipeline(this.basicPipeline);
		renderPassEncoder.setBindGroup(0, this.uniformBindGroup);
		renderPassEncoder.setVertexBuffer(0, this.cubeVerticesBuffer);
		renderPassEncoder.draw(36, 1, 0, 0);

		renderPassEncoder.endPass();

		this.device.defaultQueue.submit([commandEncoder.finish()]);
	}
}
