import ComponentProperty from "./ComponentProperty.js";

export default class ComponentPropertyBool extends ComponentProperty{
	constructor(opts){
		opts = {
			defaultValue: false,
			...opts,
		}
		super(opts);
	}

	static getTypeStr(){
		return "bool";
	}
}
