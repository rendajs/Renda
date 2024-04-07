import {GPUBindGroup} from "./GPUBindGroup.js";
import {GPUBindGroupLayout} from "./GPUBindGroupLayout.js";
import {GPUBuffer} from "./GPUBuffer.js";
import {GPUCommandEncoder} from "./GPUCommandEncoder.js";
import {GPUComputePipeline} from "./GPUComputePipeline.js";
import {GPUPipelineLayout} from "./GPUPipelineLayout.js";
import {GPUQueue} from "./GPUQueue.js";
import {GPURenderPipeline} from "./GPURenderPipeline.js";
import {GPUSampler} from "./GPUSampler.js";
import {GPUSupportedLimits} from "./GPUSupportedLimits.js";

export class GPUDevice {
	get limits() {
		return new GPUSupportedLimits();
	}

	#queue = new GPUQueue();

	get queue() {
		return this.#queue;
	}

	createBindGroupLayout() {
		return new GPUBindGroupLayout();
	}

	createSampler() {
		return new GPUSampler();
	}

	createCommandEncoder() {
		return new GPUCommandEncoder();
	}

	/**
	 * @param {GPUBufferDescriptor} opts
	 */
	createBuffer(opts) {
		return new GPUBuffer(opts);
	}

	createPipelineLayout() {
		return new GPUPipelineLayout();
	}

	createShaderModule() {}

	createRenderPipeline() {
		return new GPURenderPipeline();
	}

	createComputePipeline() {
		return new GPUComputePipeline();
	}

	createBindGroup() {
		return new GPUBindGroup();
	}
}
