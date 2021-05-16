import AssetLoaderType from "./AssetLoaderType.js";
import BinaryComposer from "../../Util/BinaryComposer.js";
import Entity from "../../Core/Entity.js";
import Mat4 from "../../Math/Mat4.js";
import defaultComponentTypeManager from "../../Components/defaultComponentTypeManager.js";

const entityBinaryStructure = {
	name: BinaryComposer.StructureTypes.STRING,
	matrix: [BinaryComposer.StructureTypes.FLOAT32],
	children: [],
	components: [{
		uuid: BinaryComposer.StructureTypes.UUID,
		propertyValues: BinaryComposer.StructureTypes.ARRAYBUFFER,
	}],
};
entityBinaryStructure.children[0] = entityBinaryStructure;

const entityBinaryNameIds = {
	name: 1,
	matrix: 2,
	children: 3,
	components: 4,
	uuid: 5,
	propertyValues: 6,
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

		return this.createEntityFromData(entityData);
	}

	createEntityFromData(data, parent = null){
		const entity = new Entity({
			name: data.name,
			matrix: new Mat4(data.matrix),
			parent,
		});
		for(const entityComponentData of data.components){
			const componentData = defaultComponentTypeManager.getComponentDataForUuid(entityComponentData.uuid);
			const propertyValues = BinaryComposer.binaryToObject(entityComponentData.propertyValues, componentData.binaryComposerOpts);
			entity.addComponent(entityComponentData.uuid, propertyValues);
		}
		for(const child of data.children){
			this.createEntityFromData(child, entity);
		}
		return entity;
	}
}
