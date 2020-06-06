import ComponentProperty from "./ComponentProperty.js";

export default class ComponentPropertyAsset extends ComponentProperty{
	constructor(opts){
		super(opts);
		this.assetType = opts.assetType || "";
	}

	static getTypeStr(){
		return "asset";
	}
}
