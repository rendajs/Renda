import AssetLoaderType from "./AssetLoaderType.js";
import BinaryComposer from "../../Util/BinaryComposer.js";

const entityBinaryStructure = {
	name: BinaryComposer.StructureTypes.STRING,
	matrix: [BinaryComposer.StructureTypes.FLOAT32],
	children: [],
};
entityBinaryStructure.children[0] = entityBinaryStructure;

export default class AssetLoaderTypeEntity extends AssetLoaderType{

	static typeUuid = "0654611f-c908-4ec0-8bbf-c109a33c0914";

	static entityBinaryStructure = entityBinaryStructure;

	static entityBinaryNameIds = {
		name: 1,
		matrix: 2,
		children: 3,
	};

	constructor(){
		super(...arguments);
	}

	async parseBuffer(buffer){
		const entityData = BinaryComposer.binaryToObject(buffer, {
			structure: AssetLoaderTypeEntity.entityBinaryStructure,
			nameIds: AssetLoaderTypeEntity.entityBinaryNameIds,
		});

		return entityData;
	}
}
