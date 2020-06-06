import ComponentProperty from "./ComponentProperty.js";
import Mat4 from "../../Math/Mat4.js";

export default class ComponentPropertyMat4 extends ComponentProperty{
	constructor(opts){
		opts = {
			defaultValue: new Mat4(),
			...opts,
		}
		super(opts);
	}

	static getTypeStr(){
		return "mat4";
	}
}
