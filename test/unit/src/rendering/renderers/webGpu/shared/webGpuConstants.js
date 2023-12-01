/**
 * Runs a function with constants such as GPUShaderStage and GPUBufferUsage assigned to the `globalThis`.
 * @param {() => void} fn
 */
export function runWithWebGpuConstants(fn) {
	const oldGPUBufferUsage = globalThis.GPUBufferUsage;
	globalThis.GPUBufferUsage = /** @type {typeof GPUBufferUsage} */ ({
		UNIFORM: 64,
		COPY_DST: 8,
	});

	const oldGPUShaderStage = globalThis.GPUShaderStage;
	globalThis.GPUShaderStage = /** @type {typeof GPUShaderStage} */ ({
		VERTEX: 0x1,
		COMPUTE: 0x2,
		FRAGMENT: 0x4,
	});

	try {
		fn();
	} finally {
		globalThis.GPUBufferUsage = oldGPUBufferUsage;
		globalThis.GPUShaderStage = oldGPUShaderStage;
	}
}
