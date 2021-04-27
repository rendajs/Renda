import AssetLoaderType from "./AssetLoaderType.js";
import BinaryComposer from "../../Util/BinaryComposer.js";

export default class AssetLoaderTypeGenericStructure extends AssetLoaderType{

	static get binaryComposerOpts(){return null}

	constructor(){
		super(...arguments);
	}

	async parseBuffer(buffer, {
		loadRecursiveAssetUuids = true,
	} = {}){
		if(loadRecursiveAssetUuids){
			return await BinaryComposer.binaryToObjectWithAssetLoader(buffer, this.assetLoader, this.constructor.binaryComposerOpts);
		}else{
			return BinaryComposer.binaryToObject(buffer, binaryComposerOpts);
		}
	}
}
