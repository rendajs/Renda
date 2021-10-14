import AssetLoaderType from "./AssetLoaderType.js";
import BinaryComposer, {StorageType} from "../../Util/BinaryComposer.js";
import Entity from "../../Core/Entity.js";
import Mat4 from "../../Math/Mat4.js";
import defaultComponentTypeManager from "../../Components/defaultComponentTypeManager.js";

/** @type {import("../../Util/BinaryComposer.js").BinaryComposerStructure} */
const entityBinaryStructure = {
	name: StorageType.STRING,
	matrix: [StorageType.FLOAT32],
	children: [],
	components: [
		{
			uuid: StorageType.UUID,
			propertyValues: StorageType.ARRAY_BUFFER,
		},
	],
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

export default class AssetLoaderTypeEntity extends AssetLoaderType {
	static get typeUuid() {
		return "0654611f-c908-4ec0-8bbf-c109a33c0914";
	}

	static get entityBinaryFormat() {
		return {
			structure: entityBinaryStructure,
			nameIds: entityBinaryNameIds,
		};
	}

	async parseBuffer(buffer) {
		const entityData = BinaryComposer.binaryToObject(buffer, AssetLoaderTypeEntity.entityBinaryFormat);

		return await this.createEntityFromData(entityData);
	}

	async createEntityFromData(data, parent = null) {
		const entity = new Entity({
			name: data.name,
			matrix: new Mat4(data.matrix),
			parent,
		});
		for (const entityComponentData of data.components) {
			const componentData = defaultComponentTypeManager.getComponentDataForUuid(entityComponentData.uuid);
			const propertyValues = await BinaryComposer.binaryToObjectWithAssetLoader(entityComponentData.propertyValues, this.assetLoader, componentData.binaryComposerOpts);
			entity.addComponent(entityComponentData.uuid, propertyValues);
		}
		for (const child of data.children) {
			await this.createEntityFromData(child, entity);
		}
		return entity;
	}
}
