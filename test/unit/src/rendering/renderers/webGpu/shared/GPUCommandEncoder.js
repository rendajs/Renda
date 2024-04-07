import {GPUComputePassEncoder} from "./GPUComputePassEncoder.js";
import {GPURenderPassEncoder} from "./GPURenderPassEncoder.js";

export class GPUCommandEncoder {
	beginRenderPass() {
		return new GPURenderPassEncoder();
	}

	beginComputePass() {
		return new GPUComputePassEncoder();
	}

	finish() {}
}
