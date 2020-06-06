import ComponentProperty from "./ComponentProperty.js";

export default class ComponentPropertyFloat extends ComponentProperty{
	constructor(opts){
		opts = {
			defaultValue: 0,
			...opts,
		}
		super(opts);
	}

	static getTypeStr(){
		return "float";
	}
}
