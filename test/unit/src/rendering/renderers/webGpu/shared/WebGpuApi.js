import {GPU} from "./GPU.js";

/**
 * @param {() => void} fn
 */
export function runWithWebGpu(fn) {
	const uninstall = installApi();
	try {
		fn();
	} finally {
		uninstall();
	}
}

/**
 * @param {() => Promise<void>} fn
 */
export async function runWithWebGpuAsync(fn) {
	const uninstall = installApi();
	try {
		await fn();
	} finally {
		uninstall();
	}
}

/** @type {GPU?} */
let installedMockGpu = null;

function installApi() {
	const oldGpu = navigator.gpu;
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

	installedMockGpu = new GPU();
	Object.defineProperty(navigator, "gpu", {
		get: () => {
			return installedMockGpu;
		},
		configurable: true,
	});

	return function uninstall() {
		installedMockGpu = null;
		Object.defineProperty(navigator, "gpu", {
			get: () => {
				return oldGpu;
			},
			configurable: true,
		});
		globalThis.GPUBufferUsage = oldGPUBufferUsage;
		globalThis.GPUShaderStage = oldGPUShaderStage;
	};
}

export function getInstalledMockGpu() {
	if (!installedMockGpu) {
		throw new Error("No mock gpu is currently installed");
	}
	return installedMockGpu;
}
