import {AssetLoaderType} from "./AssetLoaderType.js";
import {Entity} from "../../core/Entity.js";
import {Mat4} from "../../math/Mat4.js";
import {StorageType, binaryToObject, binaryToObjectWithAssetLoader} from "../../util/binarySerialization.js";

/**
 * @typedef EntityComponentStructure
 * @property {import("../../mod.js").StorageTypeEnum["UUID"]} uuid
 * @property {import("../../mod.js").StorageTypeEnum["ARRAY_BUFFER"]} propertyValues
 */

/**
 * @typedef EntityBinaryStructure
 * @property {import("../../mod.js").StorageTypeEnum["STRING"]} name
 * @property {import("../../mod.js").StorageTypeEnum["FLOAT32"][]} matrix
 * @property {EntityBinaryStructure[]} children
 * @property {EntityComponentStructure[]} components
 */

/** @type {EntityBinaryStructure} */
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

/** @typedef {import("../../util/binarySerializationTypes.js").StructureToObject<typeof entityBinaryStructure>} EnityData */

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
	 * @param {import("../../components/ComponentTypeManager.js").ComponentTypeManager} manager
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

	/**
	 * @override
	 * @param {ArrayBuffer} buffer
	 */
	async parseBuffer(buffer) {
		const entityData = binaryToObject(buffer, AssetLoaderTypeEntity.entityBinaryFormat);

		return await this.createEntityFromData(entityData);
	}

	/**
	 * @param {EnityData} data
	 * @param {Entity?} parent
	 */
	async createEntityFromData(data, parent = null) {
		const entity = new Entity({
			name: data.name,
			matrix: new Mat4(data.matrix),
			parent,
		});
		if (!this.componentTypeManager) {
			throw new Error("No component type manager set, make sure to set one with `setComponentTypeManager()` before loading entities.");
		}
		for (const entityComponentData of data.components) {
			const ComponentConstructor = this.componentTypeManager.getComponentConstructorForUuid(entityComponentData.uuid);
			if (!ComponentConstructor) {
				throw new Error(`Failed to load entity: Component type with UUID ${entityComponentData.uuid} not found. Make sure it is registered with the component type manager.`);
			}
			const propertyValues = await binaryToObjectWithAssetLoader(entityComponentData.propertyValues, this.assetLoader, ComponentConstructor.binaryComposerOpts);
			entity.addComponent(ComponentConstructor, propertyValues);
		}
		for (const child of data.children) {
			await this.createEntityFromData(child, entity);
		}
		return entity;
	}
}
