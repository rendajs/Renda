import {WebGpuChunkedBufferChunk} from "./WebGpuChunkedBufferChunk.js";
import {WebGpuChunkedBufferGroup} from "./WebGpuChunkedBufferGroup.js";

/**
 * Helper class for creating multiple WebGPU buffers (chunks) that share a similar bindgroup layout.
 * This class creates and destroys buffers based on your usage. If your data is too long
 * to fit in a single buffer, a new buffer is created.
 */
export class WebGpuChunkedBuffer {
	#device;
	get device() {
		return this.#device;
	}
	label = "";
	#minChunkSize;
	#groupAlignment;
	#usage;
	get usage() {
		return this.#usage;
	}

	/** @type {WebGpuChunkedBufferGroup[]} */
	#groups = [];
	/** @type {WebGpuChunkedBufferChunk[]} */
	#chunks = [];
	/** @type {WeakMap<WebGpuChunkedBufferGroup, {chunk: WebGpuChunkedBufferChunk, offset: number}>} */
	#assignedChunkData = new WeakMap();

	/**
	 * A chunked buffer is a way to store uniform buffer data of arbitrary length on the gpu.
	 * The way this works is that the data is distributed over multiple WebGPU buffers (chunks) when the data doesn't fit.
	 *
	 * There are three concepts:
	 * - `WebGpuChunkedBuffer` - This class.
	 * - `WebGpuChunkedBufferChunk` - A single buffer that is passed to the gpu.
	 * - `WebGpuChunkedBufferGroup` - A group of data that is guaranteed to be placed inside a single chunk.
	 * A shader can only attach so many buffers, so ideally all its uniform data is only stored in a single buffer.
	 *
	 * What we end up with is something like this:
	 *
	 * ```
	 * +-------+--------------+--------------+-------+----------------------+
	 * | Group |     Group    | Unused space | Group |       Unused space   |
	 * +-------+--------------+--------------+-------+----------------------+
	 * |              Chunk                  |              Chunk           |
	 * +-------------------------------------+------------------------------+
	 * ```
	 *
	 * Chunks are automatically destroyed and created based on the requirements of the groups.
	 * Existing chunks are reused where possible, but if there is no space left, a new chunk will be created.
	 *
	 * @param {GPUDevice} device The WebGPU device to create buffers for.
	 * @param {object} options
	 * @param {string} [options.label] The label to use for debugging.
	 * @param {number} [options.minChunkSize] The mimimum size of every buffer.
	 * It is suboptimal to put every group in its own chunk, but on the other hand, creating a very large chunk and
	 * only using a small portion of it isn't great either.
	 * Ideally a size should be picked that is large enough to fit all groups.
	 * @param {number} options.groupAlignment The value of `minUniformBufferOffsetAlignment` or
	 * `minStorageBufferOffsetAlignment` of the `GPUDevice.limits`.
	 * The limit you pick depends on whether you plan on using this as uniforms buffer or storage buffer.
	 * @param {GPUBufferUsage | number} [options.usage] The usage of the bindgroups.
	 */
	constructor(device, {
		label = "ChunkedBuffer",
		minChunkSize = 512,
		groupAlignment,
		usage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
	}) {
		this.#device = device;
		this.label = label;
		this.#minChunkSize = minChunkSize;
		this.#groupAlignment = groupAlignment;
		this.#usage = /** @type {number} */ (usage);
	}

	createGroup() {
		const group = new WebGpuChunkedBufferGroup();
		this.#groups.push(group);
		return group;
	}

	clearGroups() {
		this.#groups = [];
	}

	/**
	 * Figures out the best configuration for placing groups in each chunk and then updates all chunks on the GPU.
	 * Once this is called, any of the current groups may have been moved to a different
	 * location or even a different chunk. So any bind group entries that were created could now
	 * be invalid and would have to be requested again.
	 */
	writeAllGroupsToGpu() {
		// There are many ways to solve this problem, (look up 'bin packing' online for info),
		// but for now we'll keep this relativley simple.
		// There are many optimizations, especially since some of the groups may not have changed any of their data.
		// Ideally we would put all the groups that don't change their data frequently into the same chunk,
		// that way the chunk doesn't need to be uploaded to the gpu so frequently.
		// We also want to minimize unused space, and on top of that there are many ways to determine the buffer sizes.

		// But for now, we will simply want to remove all groups and insert them from front to back into the available chunks.

		let chunkIndex = 0;
		let cursorByteIndex = 0;
		for (const group of this.#groups) {
			let chunk = this.#chunks[chunkIndex];
			cursorByteIndex = Math.ceil(cursorByteIndex / this.#groupAlignment) * this.#groupAlignment;
			if (!chunk || cursorByteIndex + group.byteLengthWithPadding > chunk.size) {
				if (chunk) chunkIndex++;
				chunk = new WebGpuChunkedBufferChunk(this, Math.max(this.#minChunkSize, group.byteLengthWithPadding), chunkIndex);
				this.#chunks[chunkIndex] = chunk;
				cursorByteIndex = 0;
			}

			chunk.addGroup(group, cursorByteIndex);
			this.#assignedChunkData.set(group, {
				chunk,
				offset: cursorByteIndex,
			});
			cursorByteIndex += group.byteLength;
		}

		for (const chunk of this.#chunks) {
			chunk.writeToGpu();
		}
	}

	/**
	 * @param {WebGpuChunkedBufferGroup} chunkedBufferGroup
	 * @param {number} binding
	 */
	getBindGroupEntryLocation(chunkedBufferGroup, binding) {
		const assignedChunk = this.#assignedChunkData.get(chunkedBufferGroup);
		if (!assignedChunk) {
			throw new Error("This group has been removed or does not have a location assigned yet. Call `writeAllGroupsToGpu()` first.");
		}
		return {
			dynamicOffset: assignedChunk.offset,
			entry: {
				binding,
				resource: {
					buffer: assignedChunk.chunk.gpuBuffer,
					size: chunkedBufferGroup.byteLengthWithPadding,
				},
			},
		};
	}
}
