import AssetLoaderType from "./AssetLoaderType.js";
import BinaryComposer from "../../Util/BinaryComposer.js";

export default class AssetLoaderTypeGenericStructure extends AssetLoaderType{

	static structure = null;
	static nameIds = null;
	static littleEndian = true;

	constructor(){
		super();
	}

	parseBuffer(buffer){
		return BinaryComposer.binaryToObject(buffer, {
			structure: this.constructor.structure,
			nameIds: this.constructor.nameIds,
			littleEndian: this.constructor.littleEndian,
		});
	}
}
