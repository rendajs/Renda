import AssetLoaderType from "./AssetLoaderType.js";
import BinaryComposer from "../../Util/BinaryComposer.js";

export default class AssetLoaderTypeMaterial extends AssetLoaderType{

	static typeUuid = "430f47a8-82cc-4b4c-a664-2360794e80d6";

	constructor(){
		super();
	}

	parseBuffer(buffer){
		const materialData = BinaryComposer.binaryToObject(buffer, {
			structure: {
				values: [BinaryComposer.StructureTypes.INT8],
				mapDatas: [{
					typeUuid: BinaryComposer.StructureTypes.UUID,
					data: BinaryComposer.StructureTypes.ARRAYBUFFER,
				}],
			},
			nameIds: {
				values: 1,
				mapDatas: 2,
				typeUuid: 3,
				data: 4,
			},
		});
		for(const mapData of materialData.mapDatas){
			const parsedMapData = BinaryComposer.binaryToObject(mapData.data, {
				structure: {
					vertUuid: BinaryComposer.StructureTypes.UUID,
					fragUuid: BinaryComposer.StructureTypes.UUID,
				},
				nameIds: {
					vertUuid: 1,
					fragUuid: 2,
				},
			});
			console.log(parsedMapData);
		}
	}
}
