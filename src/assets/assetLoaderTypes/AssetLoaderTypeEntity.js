import {AssetLoaderType} from "./AssetLoaderType.js";
import {Entity} from "../../core/Entity.js";
import {Mat4} from "../../math/Mat4.js";
import {StorageType, binaryToObject, binaryToObjectWithAssetLoader, createObjectToBinaryOptions} from "../../util/binarySerialization.js";

/**
 * @typedef EntityComponentStructure
 * @property {import("../../mod.js").StorageTypeEnum["UUID"]} uuid
 * @property {import("../../mod.js").StorageTypeEnum["ARRAY_BUFFER"]} propertyValues
 */

/**
 * @typedef EntityBinaryStructureInline
 * @property {import("../../mod.js").StorageTypeEnum["STRING"]} name
 * @property {[import("../../mod.js").StorageTypeEnum["FLOAT32"]]} matrix
 * @property {[EntityBinaryStructure]} children
 * @property {[EntityComponentStructure]} components
 */

/** @type {EntityBinaryStructureInline} */
const entityBinaryStructureInline = {
	name: StorageType.STRING,
	matrix: [StorageType.FLOAT32],
	children: /** @type {any} */ ([]),
	components: [
		{
			uuid: StorageType.UUID,
			propertyValues: StorageType.ARRAY_BUFFER,
		},
	],
};

/**
 * @typedef EntityBinaryStructureAsset
 * @property {import("../../mod.js").StorageTypeEnum["UUID"]} assetUuid
 */

/** @type {EntityBinaryStructureAsset} */
const entityBinaryStructureAsset = {
	assetUuid: StorageType.UUID,
};

/**
 * @typedef {[import("../../mod.js").StorageTypeEnum["UNION_ARRAY"], EntityBinaryStructureAsset, EntityBinaryStructureInline]} EntityBinaryStructure
 */

/** @type {EntityBinaryStructure} */
const entityBinaryStructure = [
	StorageType.UNION_ARRAY,
	entityBinaryStructureAsset,
	entityBinaryStructureInline,
];

entityBinaryStructureInline.children[0] = entityBinaryStructure;

/** @typedef {import("../../util/binarySerializationTypes.js").StructureToObject<typeof entityBinaryStructure>} EnityData */

const entityBinaryNameIds = {
	name: 1,
	matrix: 2,
	children: 3,
	components: 4,
	uuid: 5,
	propertyValues: 6,
	assetUuid: 7,
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
		return createObjectToBinaryOptions({
			structure: entityBinaryStructureInline,
			nameIds: entityBinaryNameIds,
		});
	}

	/**
	 * @override
	 * @param {ArrayBuffer} buffer
	 * @param {import("../RecursionTracker.js").RecursionTracker} recursionTracker
	 */
	async parseBuffer(buffer, recursionTracker) {
		const entityData = binaryToObject(buffer, AssetLoaderTypeEntity.entityBinaryFormat);

		const entity = await this.createEntityFromData(entityData, null, recursionTracker);
		if (!entity) throw new Error("Assertion failed, entity is null");
		return entity;
	}

	/**
	 * @typedef ParentOptions
	 * @property {Entity} parent
	 * @property {number} childIndex
	 */

	/**
	 * @param {EnityData} data
	 * @param {ParentOptions?} parentOptions
	 * @param {import("../RecursionTracker.js").RecursionTracker} recursionTracker
	 */
	async createEntityFromData(data, parentOptions, recursionTracker) {
		if ("assetUuid" in data) {
			if (!parentOptions) {
				throw new Error("Assertion failed, parentOptions is null");
			}
			const loadingEntity = new Entity("Loading Entity");
			parentOptions.parent.addAtIndex(loadingEntity, parentOptions.childIndex);
			recursionTracker.getAsset(data.assetUuid, entity => {
				if (!(entity instanceof Entity)) {
					throw new Error(`Failed to load child entity asset with uuid ${data.assetUuid}, the asset is not of type Entity.`);
				}
				parentOptions.parent.remove(loadingEntity);
				parentOptions.parent.addAtIndex(entity, parentOptions.childIndex);
			});
			return null;
		}
		let matrix;
		if (data.matrix.length == 0) {
			matrix = new Mat4();
		} else {
			matrix = new Mat4(data.matrix);
		}
		const entity = new Entity({
			name: data.name,
			matrix,
		});
		if (!this.componentTypeManager) {
			throw new Error("No component type manager set, make sure to set one with `setComponentTypeManager()` before loading entities.");
		}
		for (const entityComponentData of data.components) {
			const ComponentConstructor = this.componentTypeManager.getComponentConstructorForUuid(entityComponentData.uuid);
			if (!ComponentConstructor) {
				throw new Error(`Failed to load entity: Component type with UUID ${entityComponentData.uuid} not found. Make sure it is registered with the component type manager.`);
			}
			if (!ComponentConstructor.binarySerializationOpts) {
				throw new Error(`Failed to load entity: Component type with UUID ${entityComponentData.uuid} has no binary composer options set.`);
			}
			const propertyValues = await binaryToObjectWithAssetLoader(entityComponentData.propertyValues, this.assetLoader, ComponentConstructor.binarySerializationOpts);
			entity.addComponent(ComponentConstructor, /** @type {any} */(propertyValues));
		}
		if (parentOptions) {
			parentOptions.parent.addAtIndex(entity, parentOptions.childIndex);
		}
		for (const [i, child] of data.children.entries()) {
			await this.createEntityFromData(child, {parent: entity, childIndex: i}, recursionTracker);
		}
		return entity;
	}
}
