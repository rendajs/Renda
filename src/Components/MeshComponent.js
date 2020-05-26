import Component from "./Component.js";

export default class MeshComponent extends Component{
	constructor(opts){
		super(opts);
		opts = {...{
			mesh: null,
			materials: [],
			material: null,
		}, ...opts}

		this.mesh = opts.mesh;

		this.materials = opts.materials;
		if(opts.material) this.material = opts.material;

		this.setComponentProperties({
			mesh: {
				type: "asset",
				onChange: _ => {this.updateProjectionMatrixAuto()},
			},
			material: {
				type: "asset",
				onChange: _ => {this.updateProjectionMatrixAuto()},
			},
		});
	}

	static get componentName(){
		return "mesh";
	}

	//todo: destructor

	get material(){
		return this.materials[0];
	}

	set material(value){
		this.materials[0] = value;
	}

	toJson(){
		return {
			type: "MeshComponent",
		}
	}
}
