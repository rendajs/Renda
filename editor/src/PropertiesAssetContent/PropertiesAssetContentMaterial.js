import PropertiesAssetContent from "./PropertiesAssetContent.js";
import {Material} from "../../../src/index.js";

export default class PropertiesAssetContentMaterial extends PropertiesAssetContent{
	constructor(){
		super();
	}

	static get useForType(){
		return Material;
	}
}
