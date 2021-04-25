import BinaryComposer from "../../../Util/BinaryComposer.js";
import MaterialMapTypeLoader from "../../../Assets/MaterialMapTypeLoader.js";

export default class MaterialMapTypeLoaderWebGpuRenderer extends MaterialMapTypeLoader{

	static typeUuid = "286eaa41-36ce-4d94-9413-d52fc435b6e5";

	constructor(){
		super(...arguments);
	}

	async parseBuffer(buffer){
		return await BinaryComposer.binaryToObjectWithAssetLoader(buffer, this.assetLoader, {
			structure: {
				forwardPipelineConfiguration: BinaryComposer.StructureTypes.UUID,
			},
			nameIds: {
				forwardPipelineConfiguration: 1,
			},
		});
	}
}
