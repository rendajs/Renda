import Component from "./Component.js";

export default class MeshComponent extends Component{
	constructor(opts){
		super(opts);
		opts = {...{
			mesh: null,
		}, ...opts}

		this.mesh = opts.mesh;
	}
}
