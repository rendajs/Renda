import {GPUBindGroupLayout} from "./GPUBindGroupLayout.js";
import {GPUBuffer} from "./GPUBuffer.js";
import {GPUCommandEncoder} from "./GPUCommandEncoder.js";
import {GPUQueue} from "./GPUQueue.js";
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
	 * @param {ConstructorParameters<typeof GPUBuffer>} opts
	 */
	createBuffer(opts) {
		return new GPUBuffer(opts);
	}

	createPipelineLayout() {}
	createShaderModule() {}
	createComputePipeline() {}
	createBindGroup() {}
}
