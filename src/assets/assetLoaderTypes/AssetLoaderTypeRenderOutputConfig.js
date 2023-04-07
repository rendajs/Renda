import {AssetLoaderTypeGenericStructure} from "./AssetLoaderTypeGenericStructure.js";
import {StorageType} from "../../util/binarySerialization.js";
import {RenderOutputConfig} from "../../rendering/RenderOutputConfig.js";

const binarySerializationOpts = {
	structure: {
		depthStencilFormat: ["stencil8", "depth16unorm", "depth24plus", "depth24plus-stencil8", "depth32float"],
		multisampleCount: StorageType.UINT8,
	},
	nameIds: {
		depthStencilFormat: 1,
		multisampleCount: 2,
	},
};

/**
 * @extends {AssetLoaderTypeGenericStructure<typeof binarySerializationOpts>}
 */
export class AssetLoaderTypeRenderOutputConfig extends AssetLoaderTypeGenericStructure {
	static get typeUuid() {
		return "b4c9bbdc-86dc-4270-ae94-780dbaa66976";
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
		const castData = /** @type {ConstructorParameters<typeof RenderOutputConfig>[0]} */ (data);
		return new RenderOutputConfig(castData);
	}
}
