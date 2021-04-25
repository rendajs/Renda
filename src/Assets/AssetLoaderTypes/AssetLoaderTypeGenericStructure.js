import AssetLoaderType from "./AssetLoaderType.js";
import BinaryComposer from "../../Util/BinaryComposer.js";

export default class AssetLoaderTypeGenericStructure extends AssetLoaderType{

	static structure = null;
	static nameIds = null;
	static littleEndian = true;

	constructor(){
		super(...arguments);
	}

	async parseBuffer(buffer, {
		loadRecursiveAssetUuids = true,
	} = {}){
		const binaryToObjectOpts = {
			structure: this.constructor.structure,
			nameIds: this.constructor.nameIds,
			littleEndian: this.constructor.littleEndian,
		};
		if(loadRecursiveAssetUuids){
			return await BinaryComposer.binaryToObjectWithAssetLoader(buffer, this.assetLoader, binaryToObjectOpts);
		}else{
			return BinaryComposer.binaryToObject(buffer, binaryToObjectOpts);
		}
	}
}
