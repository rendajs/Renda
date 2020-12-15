import AssetLoaderType from "./AssetLoaderType.js";
import Mesh from "../../Core/Mesh.js";

export default class AssetLoaderTypeMesh extends AssetLoaderType{

	static typeUuid = "f202aae6-673a-497d-806d-c2d4752bb146";

	constructor(){
		super();
	}

	parseBuffer(buffer){
		return null; //todo
	}
}
