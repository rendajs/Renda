import type { AllStorageTypes, ObjectToBinaryOptions, StorageTypeEnum } from "./mod.js";
import type { UuidString } from "./util.js";

/**
 * @fileoverview These are some TypeScript types that can be used to convert
 * `binaryToObject()` and `objectToBinary()` structure types from and to the expected return types.
 */

/**
 * The type of the structure that is passed in to `binaryToObject()` and `objectToBinary()`.
 * The type is pretty loose since structures can take a wide variety of forms.
 * This is mostly used to constrain the generics of types.
 */
export type AllowedStructureFormat = AllStorageTypes | [AllowedStructureFormat] | AllowedStructureFormat[] | { [key: string]: AllowedStructureFormat } | readonly string[];

/**
 * Convertes a binary structure to the object. This is used by both `binaryToObject()` and `objectToBinary()`.
 * In the case of `binaryToObject()`, this is used to determine the return type of the function.
 * In the case of `objectToBinary()`, this is used to determine the type of the object passed in.
 * Since `objectToBinary()` doesn't necessarily need all properties of an object (even though they are set in the structure),
 * this type has built in support for making all properties optional using `RecursivePartial<T>`.
 */
export type StructureToObject<T extends AllowedStructureFormat, TMakePartial extends boolean = false> = StructureToObjectWithPartialHelper<T, false, TMakePartial>;
/**
 * This is a utility type that converts an options object to the expected input/output object.
 *
 * ## Example usage
 * ```js
 * const objectToBinaryOptions = {
 * 	structure: {
 * 		// ...
 * 	},
 * 	nameIds: {
 * 		// ...
 * 	},
 * }
 *
 * //** @type {StructureToObject<typeof objectToBinaryOptions>} * /
 * const data = {};
 *
 * // Fill in data here...
 *
 * const binary = objectToBinary(data, objectToBinaryOptions);
 * ```
 *
 * Doing it this way allows you to have type checking and autocompletion while filling in values for the `data` variable.
 */
export type OptionsToObject<T extends ObjectToBinaryOptions<any>, TMakePartial extends boolean = false> = StructureToObject<T["structure"], TMakePartial>;
export type StructureToObjectWithAssetLoader<T extends AllowedStructureFormat> = StructureItemToObjectHelper<T, true>;
export type StructureToObjectWithMaybeAssetLoader<T extends AllowedStructureFormat> = StructureItemToObjectHelper<T, true | false>;
export type StructureItemToObject<T extends AllowedStructureFormat> = StructureItemToObjectHelper<T, false>;

type StructureToObjectWithPartialHelper<T extends AllowedStructureFormat, TUseAssetLoader extends boolean, TMakePartial extends boolean = false> =
	StructureItemToObjectHelper<T, TUseAssetLoader> extends infer GeneratedObjectType ?
		TMakePartial extends true ?
			GeneratedObjectType extends object ?
				RecursivePartial<GeneratedObjectType> :
				GeneratedObjectType :
			GeneratedObjectType :
		never;

type StructureItemToObjectHelper<T extends AllowedStructureFormat, TUseAssetLoader extends boolean> =
	T extends StorageTypeEnum["INT8"] ? number :
	T extends StorageTypeEnum["INT16"] ? number :
	T extends StorageTypeEnum["INT32"] ? number :
	T extends StorageTypeEnum["UINT8"] ? number :
	T extends StorageTypeEnum["UINT16"] ? number :
	T extends StorageTypeEnum["UINT32"] ? number :
	T extends StorageTypeEnum["FLOAT32"] ? number :
	T extends StorageTypeEnum["FLOAT64"] ? number :
	T extends StorageTypeEnum["ARRAY"] ? never :
	T extends StorageTypeEnum["OBJECT"] ? never :
	T extends StorageTypeEnum["STRING"] ? string :
	T extends StorageTypeEnum["BOOL"] ? boolean :
	T extends StorageTypeEnum["UUID"] ? UuidString :
	T extends StorageTypeEnum["ASSET_UUID"] ?
		TUseAssetLoader extends true ?
			unknown :
			UuidString :
	T extends StorageTypeEnum["ARRAY_BUFFER"] ? ArrayBuffer :
	T extends StorageTypeEnum["NULL"] ? null :
	T extends [infer ArrayType] ?
		ArrayType extends AllowedStructureFormat ?
			StructureItemToObjectHelper<ArrayType, TUseAssetLoader>[] :
			never :
	T extends [StorageTypeEnum["UNION_ARRAY"], ...infer UnionArrayTypes] ?
		UnionArrayTypes extends (infer UnionArrayType)[] ?
			UnionArrayType extends AllowedStructureFormat ?
				StructureItemToObjectHelper<UnionArrayType, TUseAssetLoader> :
				never :
			never :
	T extends readonly (infer ArrayType)[] ?
		ArrayType extends string ?
			ArrayType :
		ArrayType extends AllowedStructureFormat ?
			StructureItemToObjectHelper<ArrayType, TUseAssetLoader>[] :
		never :
	T extends {[key: string]: AllowedStructureFormat} ?
		{
			[key in keyof T]: T[key] extends AllowedStructureFormat ? StructureItemToObjectHelper<T[key], TUseAssetLoader> : never;
		} :
never;

type RecursivePartial<T extends object> = {
	[K in keyof T]?: RecursivePartialItem<T[K]>;
}

type RecursivePartialItem<T> =
	T extends (infer U)[] ? RecursivePartialItem<U>[] :
	T extends UuidString ? T :
	T extends object ? RecursivePartial<T> :
	T;
