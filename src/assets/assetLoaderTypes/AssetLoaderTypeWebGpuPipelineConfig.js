import {AssetLoaderTypeGenericStructure} from "./AssetLoaderTypeGenericStructure.js";
import {StorageType} from "../../util/binarySerialization.js";
import {WebGpuPipelineConfig} from "../../rendering/renderers/webGpu/WebGpuPipelineConfig.js";

export const primitiveTopologyTypes = ["point-list", "line-list", "line-strip", "triangle-list", "triangle-strip"];

export const compareFunction = ["never", "less", "equal", "less-equal", "greater", "not-equal", "greater-equal", "always"];

export const blendOperation = ["add", "subtract", "reverse-subtract", "min", "max"];

export const blendFactor = ["zero", "one", "src", "one-minus-src", "src-alpha", "one-minus-src-alpha", "dst", "one-minus-dst", "dst-alpha", "one-minus-dst-alpha", "src-alpha-saturated", "constant", "one-minus-constant"];

const binarySerializationOpts = {
	structure: {
		vertexShader: StorageType.ASSET_UUID,
		fragmentShader: StorageType.ASSET_UUID,
		primitiveTopology: primitiveTopologyTypes,
		preloadVertexStates: [StorageType.ASSET_UUID],
	},
	nameIds: {
		vertexShader: 1,
		fragmentShader: 2,
		primitiveTopology: 3,
		preloadVertexStates: 4,
	},
};

/**
 * @extends {AssetLoaderTypeGenericStructure<typeof binarySerializationOpts>}
 */
export class AssetLoaderTypeWebGpuPipelineConfig extends AssetLoaderTypeGenericStructure {
	static get typeUuid() {
		return "c850b2eb-ab27-4991-b30e-b60d70ff6a2d";
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
		const castData = /** @type {ConstructorParameters<typeof WebGpuPipelineConfig>[0]} */ (data);
		return new WebGpuPipelineConfig(castData);
	}
}
