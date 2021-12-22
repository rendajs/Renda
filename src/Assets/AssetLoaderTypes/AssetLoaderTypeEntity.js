import {AssetLoaderType} from "./AssetLoaderType.js";
import {BinaryComposer, StorageType} from "../../util/BinaryComposer.js";
import {Entity} from "../../core/Entity.js";
import Mat4 from "../../Math/Mat4.js";

/** @type {import("../../util/BinaryComposer.js").BinaryComposerStructure} */
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

export class AssetLoaderTypeEntity extends AssetLoaderType {
	static get typeUuid() {
		return "0654611f-c908-4ec0-8bbf-c109a33c0914";
	}

	/**
	 * @param  {ConstructorParameters<typeof AssetLoaderType>} args
	 */
	constructor(...args) {
		super(...args);

		this.componentTypeManager = null;
	}

	/**
	 * @param {import("../../Components/ComponentTypeManager.js").ComponentTypeManager} manager
	 */
	setComponentTypeManager(manager) {
		this.componentTypeManager = manager;
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
			const ComponentConstructor = this.componentTypeManager.getComponentConstructorForUuid(entityComponentData.uuid);
			const propertyValues = await BinaryComposer.binaryToObjectWithAssetLoader(entityComponentData.propertyValues, this.assetLoader, ComponentConstructor.binaryComposerOpts);
			entity.addComponent(ComponentConstructor, propertyValues);
		}
		for (const child of data.children) {
			await this.createEntityFromData(child, entity);
		}
		return entity;
	}
}
