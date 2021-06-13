import Mesh from "../../Core/Mesh.js";
import { EDITOR_DEFAULTS_IN_COMPONENTS } from "../../engineDefines.js";
import Material from "../../Rendering/Material.js";
import BinaryComposer from "../../Util/BinaryComposer.js";

const MeshComponent = {
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
			mesh: BinaryComposer.StructureTypes.ASSET_UUID,
			materials: [BinaryComposer.StructureTypes.ASSET_UUID],
		},
		nameIds: {
			mesh: 1,
			materials: 2,
		},
	},
};

if(EDITOR_DEFAULTS_IN_COMPONENTS){
	const defaultMaterialAssetLinkUuid = "f1e469e3-b463-4542-952a-091487bf5b4a";
	MeshComponent.properties.materials.defaultValue = [defaultMaterialAssetLinkUuid];
}

export default MeshComponent;
