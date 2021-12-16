import AssetLoaderTypeGenericStructure from "./AssetLoaderTypeGenericStructure.js";
import {StorageType} from "../../util/BinaryComposer.js";
import {VertexState} from "../../Rendering/VertexState.js";

export class AssetLoaderTypeVertexState extends AssetLoaderTypeGenericStructure {
	static get typeUuid() {
		return "07dcd52e-03a5-4823-b343-16a142c304f6";
	}

	static get binaryComposerOpts() {
		return {
			structure: {
				buffers: [
					{
						arrayStride: StorageType.INT16, // todo: support serializing auto value
						stepMode: ["vertex", "instance"],
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
	}

	async parseBuffer(buffer) {
		const data = await super.parseBuffer(buffer);
		return new VertexState(data);
	}
}
