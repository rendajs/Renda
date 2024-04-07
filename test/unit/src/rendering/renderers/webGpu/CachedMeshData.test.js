import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {assertEquals, assertExists} from "std/testing/asserts.ts";
import {Mesh} from "../../../../../../src/mod.js";
import {CachedMeshData} from "../../../../../../src/rendering/renderers/webGpu/CachedMeshData.js";
import {runWithWebGpu} from "./shared/WebGpuApi.js";

function createMocks({
	hasDevice = true,
} = {}) {
	/**
	 * @typedef CreatedBufferData
	 * @property {GPUBuffer} mockGpuBuffer
	 * @property {import("std/testing/mock.ts").Spy<GPUBuffer, [offset?: number, size?: number], ArrayBuffer>} getMappedRangeSpy
	 * @property {import("std/testing/mock.ts").Spy<GPUBuffer, [], undefined>} unmapSpy
	 */
	/** @type {CreatedBufferData[]} */
	const createdBuffers = [];
	const mockDevice = /** @type {GPUDevice} */ ({
		createBuffer(descriptor) {
			if (descriptor.mappedAtCreation && descriptor.size % 4 != 0) {
				throw new Error(`Buffer is mapped at creation but its size (${descriptor.size}) is not a multiple of 4.`);
			}
			const mockGpuBuffer = /** @type {GPUBuffer} */ ({
				getMappedRange(offset, size) {
					return new ArrayBuffer(size || descriptor.size);
				},
				unmap() {},
			});
			createdBuffers.push({
				mockGpuBuffer,
				getMappedRangeSpy: spy(mockGpuBuffer, "getMappedRange"),
				unmapSpy: spy(mockGpuBuffer, "unmap"),
			});
			return mockGpuBuffer;
		},
	});
	const createBufferSpy = spy(mockDevice, "createBuffer");
	const mockRenderer = /** @type {import("../../../../../../src/mod.js").WebGpuRenderer} */ ({
		device: hasDevice ? mockDevice : null,
		isInit: true,
	});

	return {mockRenderer, mockDevice, createBufferSpy, createdBuffers};
}

Deno.test({
	name: "Index buffers are 4 byte aligned",
	fn() {
		runWithWebGpu(() => {
			const {mockRenderer, createBufferSpy, createdBuffers} = createMocks();
			const mesh = new Mesh();
			mesh.setIndexData([1, 2, 3]);
			new CachedMeshData(mesh, mockRenderer);

			assertSpyCalls(createBufferSpy, 1);
			assertSpyCall(createBufferSpy, 0, {
				args: [
					{
						size: 8,
						usage: GPUBufferUsage.INDEX,
						mappedAtCreation: true,
						label: "CachedMeshDataIndexBuffer",
					},
				],
			});
			assertEquals(createdBuffers.length, 1);
			assertSpyCalls(createdBuffers[0].getMappedRangeSpy, 1);
			const mappedRangeBuffer = createdBuffers[0].getMappedRangeSpy.calls[0].returned;
			assertExists(mappedRangeBuffer);
			const mappedRangeView = new Uint8Array(mappedRangeBuffer);
			assertEquals(Array.from(mappedRangeView), [1, 0, 2, 0, 3, 0, 0, 0]);
			assertSpyCalls(createdBuffers[0].unmapSpy, 1);
		});
	},
});
