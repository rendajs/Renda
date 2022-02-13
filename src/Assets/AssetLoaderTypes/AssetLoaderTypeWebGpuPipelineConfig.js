import {AssetLoaderTypeGenericStructure} from "./AssetLoaderTypeGenericStructure.js";
import {StorageType} from "../../util/BinaryComposer.js";
import {WebGpuPipelineConfig} from "../../rendering/Renderers/webGpu/WebGpuPipelineConfig.js";

export class AssetLoaderTypeWebGpuPipelineConfig extends AssetLoaderTypeGenericStructure {
	static get typeUuid() {
		return "c850b2eb-ab27-4991-b30e-b60d70ff6a2d";
	}

	static get primitiveTopologyTypes() {
		return ["point-list", "line-list", "line-strip", "triangle-list", "triangle-strip"];
	}

	static get binaryComposerOpts() {
		return {
			structure: {
				vertexShader: StorageType.ASSET_UUID,
				fragmentShader: StorageType.ASSET_UUID,
				primitiveTopology: AssetLoaderTypeWebGpuPipelineConfig.primitiveTopologyTypes,
				preloadVertexStates: [StorageType.ASSET_UUID],
			},
			nameIds: {
				vertexShader: 1,
				fragmentShader: 2,
				primitiveTopology: 3,
				preloadVertexStates: 4,
			},
		};
	}

	async parseBuffer(buffer) {
		const data = await super.parseBuffer(buffer);
		return new WebGpuPipelineConfig(data);
	}
}
