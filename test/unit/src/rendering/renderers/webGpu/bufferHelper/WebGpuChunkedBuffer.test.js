import { assertSpyCalls, spy } from "std/testing/mock.ts";
import { WebGpuChunkedBuffer } from "../../../../../../../src/rendering/renderers/webGpu/bufferHelper/WebGpuChunkedBuffer.js";
import { assertEquals, assertInstanceOf, assertStrictEquals, assertThrows } from "std/testing/asserts.ts";
import { Vec3 } from "../../../../../../../src/mod.js";
import { runWithWebGpuConstants } from "../shared/webGpuConstants.js";

class MockGPUBuffer {
	/**
	 * @param {GPUBufferDescriptor} descriptor
	 */
	constructor(descriptor) {
		this.descriptor = descriptor;
	}
}

/** @typedef {import("std/testing/mock.ts").Spy<GPUQueue, Parameters<GPUQueue["writeBuffer"]>, undefined>} WriteBufferSpy */

/**
 * @typedef WebGpuChunkedBufferTestContext
 * @property {GPUDevice} device
 * @property {WriteBufferSpy} writeBufferSpy
 * @property {MockGPUBuffer[]} createdBuffers
 */

/**
 * @param {object} options
 * @param {(ctx: WebGpuChunkedBufferTestContext) => void} options.fn
 */
function basicTest({ fn }) {
	/** @type {MockGPUBuffer[]} */
	const createdBuffers = [];

	const device = /** @type {GPUDevice} */ ({
		createBuffer(descriptor) {
			const buffer = new MockGPUBuffer(descriptor);
			createdBuffers.push(buffer);
			return /** @type {GPUBuffer} */ (/** @type {unknown} */ (buffer));
		},
		queue: {
			writeBuffer(buffer, offset, data, dataOffset, size) {},
		},
	});

	const writeBufferSpy = spy(device.queue, "writeBuffer");

	runWithWebGpuConstants(() => {
		fn({
			device,
			writeBufferSpy,
			createdBuffers,
		});
	});
}

/**
 * @param {WriteBufferSpy} writeBufferSpy
 * @param {{bytes: number[], label: string}[]} expectedWrites
 */
function assertWrittenGpuBuffers(writeBufferSpy, expectedWrites) {
	assertSpyCalls(writeBufferSpy, expectedWrites.length);

	for (let i = 0; i < expectedWrites.length; i++) {
		const expectedWrite = expectedWrites[i];

		const gpuBuffer = writeBufferSpy.calls[i].args[0];
		assertInstanceOf(gpuBuffer, MockGPUBuffer);
		assertEquals(gpuBuffer.descriptor.label, expectedWrite.label);
		assertEquals(writeBufferSpy.calls[i].args[1], 0);
		const buffer = writeBufferSpy.calls[i].args[2];
		assertInstanceOf(buffer, ArrayBuffer);
		assertEquals(Array.from(new Uint8Array(buffer)), expectedWrite.bytes);
	}
}

/**
 * @param {ReturnType<WebGpuChunkedBuffer["getBindGroupEntryLocation"]>} entryLocation
 * @param {object} expectedLocationData
 * @param {number} expectedLocationData.dynamicOffset
 * @param {number} expectedLocationData.binding
 * @param {MockGPUBuffer | GPUBuffer} expectedLocationData.resourceBuffer
 * @param {number} expectedLocationData.resourceSize
 */
function assertGroupEntryLocation(entryLocation, expectedLocationData) {
	assertEquals(entryLocation.dynamicOffset, expectedLocationData.dynamicOffset);
	assertEquals(entryLocation.entry.binding, expectedLocationData.binding);
	assertEquals(entryLocation.entry.resource.size, expectedLocationData.resourceSize);
	assertStrictEquals(entryLocation.entry.resource.buffer, expectedLocationData.resourceBuffer);
}

Deno.test({
	name: "Two groups are aligned based on groupAlignment",
	fn() {
		basicTest({
			fn({ device, writeBufferSpy }) {
				const chunkedBuffer = new WebGpuChunkedBuffer(device, {
					label: "The label",
					groupAlignment: 8,
					minChunkSize: 16,
				});
				const group1 = chunkedBuffer.createGroup();
				group1.appendScalar(42, "u32");
				const group2 = chunkedBuffer.createGroup();
				group2.appendBuffer(new Uint8Array([1, 2]));

				chunkedBuffer.writeAllGroupsToGpu();
				assertWrittenGpuBuffers(writeBufferSpy, [
					{
						label: "The label-chunk0",
						bytes: [42, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 0, 0],
					},
				]);

				assertGroupEntryLocation(chunkedBuffer.getBindGroupEntryLocation(group1, 123), {
					dynamicOffset: 0,
					binding: 123,
					resourceBuffer: writeBufferSpy.calls[0].args[0],
					resourceSize: 4,
				});
				assertGroupEntryLocation(chunkedBuffer.getBindGroupEntryLocation(group2, 456), {
					dynamicOffset: 8,
					binding: 456,
					resourceBuffer: writeBufferSpy.calls[0].args[0],
					resourceSize: 2,
				});
			},
		});
	},
});

Deno.test({
	name: "One groups needs padding, a group next to it is placed inside that padding",
	fn() {
		basicTest({
			fn({ device, writeBufferSpy }) {
				const chunkedBuffer = new WebGpuChunkedBuffer(device, {
					label: "The label",
					groupAlignment: 4,
					minChunkSize: 16,
				});
				const group1 = chunkedBuffer.createGroup();
				group1.appendMathType(new Vec3(1, 2, 3), "u32");
				const group2 = chunkedBuffer.createGroup();
				group2.appendBuffer(new Uint8Array([5, 6, 7, 8]));

				chunkedBuffer.writeAllGroupsToGpu();
				assertWrittenGpuBuffers(writeBufferSpy, [
					{
						label: "The label-chunk0",
						bytes: [1, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0, 5, 6, 7, 8],
					},
				]);

				assertGroupEntryLocation(chunkedBuffer.getBindGroupEntryLocation(group1, 123), {
					dynamicOffset: 0,
					binding: 123,
					resourceBuffer: writeBufferSpy.calls[0].args[0],
					resourceSize: 16,
				});
				assertGroupEntryLocation(chunkedBuffer.getBindGroupEntryLocation(group2, 456), {
					dynamicOffset: 12,
					binding: 456,
					resourceBuffer: writeBufferSpy.calls[0].args[0],
					resourceSize: 4,
				});
			},
		});
	},
});

Deno.test({
	name: "A group that needs padding getting placed at the end of a chunk causes new chunk creation",
	fn() {
		basicTest({
			fn({ device, writeBufferSpy }) {
				const chunkedBuffer = new WebGpuChunkedBuffer(device, {
					label: "The label",
					groupAlignment: 4,
					minChunkSize: 8,
				});
				const group1 = chunkedBuffer.createGroup();
				group1.appendBuffer(new Uint8Array([1, 2, 3, 4]));
				const group2 = chunkedBuffer.createGroup();
				group2.appendMathType(new Vec3(5, 6, 7), "u32");

				chunkedBuffer.writeAllGroupsToGpu();
				assertWrittenGpuBuffers(writeBufferSpy, [
					{
						label: "The label-chunk0",
						bytes: [1, 2, 3, 4, 0, 0, 0, 0],
					}, {
						label: "The label-chunk1",
						bytes: [5, 0, 0, 0, 6, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0],
					},
				]);

				assertGroupEntryLocation(chunkedBuffer.getBindGroupEntryLocation(group1, 123), {
					dynamicOffset: 0,
					binding: 123,
					resourceBuffer: writeBufferSpy.calls[0].args[0],
					resourceSize: 4,
				});
				assertGroupEntryLocation(chunkedBuffer.getBindGroupEntryLocation(group2, 456), {
					dynamicOffset: 0,
					binding: 456,
					resourceBuffer: writeBufferSpy.calls[1].args[0],
					resourceSize: 16,
				});
			},
		});
	},
});

Deno.test({
	name: "Groups that don't fit in a single chunk",
	fn() {
		basicTest({
			fn({ device, writeBufferSpy }) {
				const chunkedBuffer = new WebGpuChunkedBuffer(device, {
					groupAlignment: 4,
					minChunkSize: 4,
				});

				const group1 = chunkedBuffer.createGroup();
				group1.appendScalar(42, "u32");
				const group2 = chunkedBuffer.createGroup();
				group2.appendBuffer(new Uint8Array([1, 2]));

				chunkedBuffer.writeAllGroupsToGpu();
				assertWrittenGpuBuffers(writeBufferSpy, [
					{
						label: "ChunkedBuffer-chunk0",
						bytes: [42, 0, 0, 0],
					}, {
						label: "ChunkedBuffer-chunk1",
						bytes: [1, 2, 0, 0],
					},
				]);

				assertGroupEntryLocation(chunkedBuffer.getBindGroupEntryLocation(group1, 123), {
					dynamicOffset: 0,
					binding: 123,
					resourceBuffer: writeBufferSpy.calls[0].args[0],
					resourceSize: 4,
				});
				assertGroupEntryLocation(chunkedBuffer.getBindGroupEntryLocation(group2, 456), {
					dynamicOffset: 0,
					binding: 456,
					resourceBuffer: writeBufferSpy.calls[1].args[0],
					resourceSize: 2,
				});
			},
		});
	},
});

Deno.test({
	name: "Group that doesn't fit in minChunkSize",
	fn() {
		basicTest({
			fn({ device, writeBufferSpy }) {
				const chunkedBuffer = new WebGpuChunkedBuffer(device, {
					groupAlignment: 4,
					minChunkSize: 4,
				});

				const group1 = chunkedBuffer.createGroup();
				group1.appendScalar(42, "u32");
				const group2 = chunkedBuffer.createGroup();
				group2.appendBuffer(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));

				chunkedBuffer.writeAllGroupsToGpu();
				assertWrittenGpuBuffers(writeBufferSpy, [
					{
						label: "ChunkedBuffer-chunk0",
						bytes: [42, 0, 0, 0],
					}, {
						label: "ChunkedBuffer-chunk1",
						bytes: [1, 2, 3, 4, 5, 6, 7, 8],
					},
				]);

				assertGroupEntryLocation(chunkedBuffer.getBindGroupEntryLocation(group1, 123), {
					dynamicOffset: 0,
					binding: 123,
					resourceBuffer: writeBufferSpy.calls[0].args[0],
					resourceSize: 4,
				});
				assertGroupEntryLocation(chunkedBuffer.getBindGroupEntryLocation(group2, 456), {
					dynamicOffset: 0,
					binding: 456,
					resourceBuffer: writeBufferSpy.calls[1].args[0],
					resourceSize: 8,
				});
			},
		});
	},
});

Deno.test({
	name: "getBindGroupEntryLocation() throws when called before writing buffers to the gpu",
	fn() {
		basicTest({
			fn({ device }) {
				const chunkedBuffer = new WebGpuChunkedBuffer(device, {
					groupAlignment: 4,
					minChunkSize: 4,
				});

				const group = chunkedBuffer.createGroup();
				group.appendScalar(42, "u32");

				assertThrows(() => {
					chunkedBuffer.getBindGroupEntryLocation(group, 123);
				}, Error, "This group has been removed or does not have a location assigned yet. Call `writeAllGroupsToGpu()` first.");
			},
		});
	},
});

Deno.test({
	name: "clearGroups() removes all groups",
	fn() {
		basicTest({
			fn({ device, writeBufferSpy }) {
				const chunkedBuffer = new WebGpuChunkedBuffer(device, {
					groupAlignment: 4,
					minChunkSize: 4,
				});

				const group1 = chunkedBuffer.createGroup();
				group1.appendBuffer(new Uint8Array([1, 2, 3, 4]));

				chunkedBuffer.clearGroups();

				const group2 = chunkedBuffer.createGroup();
				group2.appendBuffer(new Uint8Array([5, 6, 7, 8]));

				chunkedBuffer.writeAllGroupsToGpu();
				assertWrittenGpuBuffers(writeBufferSpy, [
					{
						label: "ChunkedBuffer-chunk0",
						bytes: [5, 6, 7, 8],
					},
				]);

				assertGroupEntryLocation(chunkedBuffer.getBindGroupEntryLocation(group2, 123), {
					dynamicOffset: 0,
					binding: 123,
					resourceBuffer: writeBufferSpy.calls[0].args[0],
					resourceSize: 4,
				});

				assertThrows(() => {
					chunkedBuffer.getBindGroupEntryLocation(group1, 456);
				}, Error, "This group has been removed or does not have a location assigned yet. Call `writeAllGroupsToGpu()` first.");
			},
		});
	},
});

Deno.test({
	name: "calling writeAllGroupsToGpu() reuses previous buffers",
	fn() {
		basicTest({
			fn({ device, writeBufferSpy, createdBuffers }) {
				const chunkedBuffer = new WebGpuChunkedBuffer(device, {
					groupAlignment: 4,
					minChunkSize: 4,
				});

				const group1 = chunkedBuffer.createGroup();
				group1.appendBuffer(new Uint8Array([1, 2, 3, 4]));

				chunkedBuffer.writeAllGroupsToGpu();
				assertEquals(createdBuffers.length, 1);
				assertWrittenGpuBuffers(writeBufferSpy, [
					{
						label: "ChunkedBuffer-chunk0",
						bytes: [1, 2, 3, 4],
					},
				]);

				chunkedBuffer.writeAllGroupsToGpu();
				assertEquals(createdBuffers.length, 1);
				assertWrittenGpuBuffers(writeBufferSpy, [
					{
						label: "ChunkedBuffer-chunk0",
						bytes: [1, 2, 3, 4],
					},
					{
						label: "ChunkedBuffer-chunk0",
						bytes: [1, 2, 3, 4],
					},
				]);
			},
		});
	},
});
