import BinaryComposer from "../../../Util/BinaryComposer.js";
import MaterialMapTypeLoader from "../../../Assets/MaterialMapTypeLoader.js";

export default class MaterialMapTypeLoaderWebGpuRenderer extends MaterialMapTypeLoader{

	static get typeUuid(){
		return "286eaa41-36ce-4d94-9413-d52fc435b6e5";
	}

	constructor(){
		super(...arguments);
	}

	async parseBuffer(buffer){
		return await BinaryComposer.binaryToObjectWithAssetLoader(buffer, this.assetLoader, {
			structure: {
				forwardPipelineConfig: BinaryComposer.StructureTypes.ASSET_UUID,
			},
			nameIds: {
				forwardPipelineConfig: 1,
			},
		});
	}
}
