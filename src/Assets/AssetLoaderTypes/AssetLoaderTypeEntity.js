import AssetLoaderType from "./AssetLoaderType.js";
import BinaryComposer from "../../Util/BinaryComposer.js";

const entityBinaryStructure = {
	name: BinaryComposer.StructureTypes.STRING,
	matrix: [BinaryComposer.StructureTypes.FLOAT32],
	children: [],
	components: [{
		uuid: BinaryComposer.StructureTypes.UUID,
		// componentData: BinaryComposer.StructureTypes.ARRAYBUFFER,
	}],
};
entityBinaryStructure.children[0] = entityBinaryStructure;

const entityBinaryNameIds = {
	name: 1,
	matrix: 2,
	children: 3,
	components: 4,
	uuid: 5,
	componentData: 6,
};

export default class AssetLoaderTypeEntity extends AssetLoaderType{

	static get typeUuid(){
		return "0654611f-c908-4ec0-8bbf-c109a33c0914";
	}

	static get entityBinaryFormat(){
		return {
			structure: entityBinaryStructure,
			nameIds: entityBinaryNameIds,
		};
	}

	constructor(){
		super(...arguments);
	}

	async parseBuffer(buffer){
		const entityData = BinaryComposer.binaryToObject(buffer, AssetLoaderTypeEntity.entityBinaryFormat);

		return entityData;
	}
}
