import ComponentProperty from "./ComponentProperty.js";

export default class ComponentPropertyArray extends ComponentProperty{
	constructor(opts){
		opts = {
			defaultValue: [],
			...opts,
		}
		super(opts);
	}

	static getTypeStr(){
		return "array";
	}
}
