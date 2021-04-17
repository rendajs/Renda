import {Mesh, Material} from "../../index.js";

export default {
	uuid: "c7fc3a04-fa51-49aa-8f04-864c0cebf49c",
	name: "Mesh",
	properties: {
		mesh: {
			type: Mesh,
		},
		materials: {
			type: Array,
			arrayOpts: {
				type: Material,
			},
		},
	},
};
