import ComponentProperty from "./ComponentProperty.js";

export default class ComponentPropertyArray extends ComponentProperty{
	constructor(opts){
		opts = {
			defaultValue: [],
			arrayTypeOpts: {},
			...opts,
		}
		super(opts);

		this.arrayTypeOpts = opts.arrayTypeOpts;
		this.arrayProperties = [];
	}
}
