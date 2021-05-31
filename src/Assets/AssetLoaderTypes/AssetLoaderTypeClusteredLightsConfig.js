import AssetLoaderTypeGenericStructure from "./AssetLoaderTypeGenericStructure.js";
import BinaryComposer from "../../Util/BinaryComposer.js";
import ClusteredLightsConfig from "../../Rendering/ClusteredLightsConfig.js";

export default class AssetLoaderTypeClusteredLightsConfig extends AssetLoaderTypeGenericStructure{

	static get typeUuid(){
		return "13194e5c-01e8-4ecc-b645-86626b9d5e4c";
	}

	static get binaryComposerOpts(){
		return {
			structure: {
				clusterCount: [BinaryComposer.StructureTypes.UINT32],
				maxLightsPerClusterPass: BinaryComposer.StructureTypes.UINT32,
			},
			nameIds: {
				clusterCount: 1,
				maxLightsPerClusterPass: 2,
			},
		}
	}

	constructor(){
		super(...arguments);
	}

	async parseBuffer(buffer){
		const data = await super.parseBuffer(buffer);
		return new ClusteredLightsConfig(data);
	}
}
