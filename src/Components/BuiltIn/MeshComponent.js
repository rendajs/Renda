import {Mesh, Material} from "../../index.js";
import BinaryComposer from "../../Util/BinaryComposer.js";

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
	binaryComposerOpts: {
		structure: {
			mesh: BinaryComposer.StructureTypes.UUID,
			materials: [BinaryComposer.StructureTypes.UUID],
		},
		nameIds: {
			mesh: 1,
			materials: 2,
		},
	},
};
