import {AssetLoaderTypeGenericStructure} from "./AssetLoaderTypeGenericStructure.js";
import {StorageType} from "../../util/binarySerialization.js";
import {WebGpuPipelineConfig} from "../../rendering/Renderers/webGpu/WebGpuPipelineConfig.js";

export const primitiveTopologyTypes = ["point-list", "line-list", "line-strip", "triangle-list", "triangle-strip"];

export const compareFunction = ["never", "less", "equal", "less-equal", "greater", "not-equal", "greater-equal", "always"];

const binaryComposerOpts = {
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
 * @extends {AssetLoaderTypeGenericStructure<typeof binaryComposerOpts>}
 */
export class AssetLoaderTypeWebGpuPipelineConfig extends AssetLoaderTypeGenericStructure {
	static get typeUuid() {
		return "c850b2eb-ab27-4991-b30e-b60d70ff6a2d";
	}

	static get binaryComposerOpts() {
		return binaryComposerOpts;
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
