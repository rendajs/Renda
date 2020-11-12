import {Mesh, Material} from "../../index.js";

export default {
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
