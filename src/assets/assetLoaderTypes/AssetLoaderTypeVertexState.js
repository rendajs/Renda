import { AssetLoaderTypeGenericStructure } from "./AssetLoaderTypeGenericStructure.js";
import { StorageType } from "../../util/binarySerialization.js";
import { VertexState } from "../../rendering/VertexState.js";

const binarySerializationOpts = {
	structure: {
		buffers: [
			{
				arrayStride: StorageType.INT16, // todo: support serializing auto value
				stepMode: /** @type {GPUVertexStepMode[]} */ (["vertex", "instance"]),
				attributes: [
					{
						attributeType: StorageType.INT8,
						format: StorageType.INT8,
						componentCount: StorageType.INT8,
						unsigned: StorageType.BOOL,
						shaderLocation: StorageType.INT8, // todo: support serializing auto value
					},
				],
			},
		],
	},
	nameIds: {
		buffers: 1,
		arrayStride: 2,
		stepMode: 3,
		attributes: 4,
		attributeType: 5,
		format: 6,
		componentCount: 7,
		unsigned: 8,
		shaderLocation: 9,
	},
};

/**
 * @extends {AssetLoaderTypeGenericStructure<typeof binarySerializationOpts, VertexState>}
 */
export class AssetLoaderTypeVertexState extends AssetLoaderTypeGenericStructure {
	static get typeUuid() {
		return "07dcd52e-03a5-4823-b343-16a142c304f6";
	}

	static get binarySerializationOpts() {
		return binarySerializationOpts;
	}

	/**
	 * @override
	 * @param {ArrayBuffer} buffer
	 */
	async parseBuffer(buffer) {
		const data = await this.getBufferData(buffer);
		return new VertexState(data);
	}
}
