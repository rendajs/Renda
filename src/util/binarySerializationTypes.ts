import type { AllStorageTypes, StorageTypeEnum } from "./mod";
import type { UuidString } from "./util";

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
export type StructureToObjectWithAssetLoader<T extends AllowedStructureFormat> = StructureToObjectHelper<T, true>;
export type StructureToObjectWithMaybeAssetLoader<T extends AllowedStructureFormat> = StructureToObjectHelper<T, true | false>;
export type StructureItemToObject<T extends AllowedStructureFormat> = StructureItemToObjectHelper<T, false>;

type StructureToObjectWithPartialHelper<T extends AllowedStructureFormat, TUseAssetLoader extends boolean, TMakePartial extends boolean = false> =
	TMakePartial extends true ?
		RecursivePartial<StructureToObjectHelper<T, TUseAssetLoader>> :
		StructureToObjectHelper<T, TUseAssetLoader>;

type StructureToObjectHelper<T extends AllowedStructureFormat, TUseAssetLoader extends boolean> = {
	[key in keyof T]: T[key] extends AllowedStructureFormat ? StructureItemToObjectHelper<T[key], TUseAssetLoader> : never;
}

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
			StructureItemToObject<ArrayType>[] :
			never :
	T extends readonly (infer ArrayType)[] ?
		ArrayType extends string ?
			ArrayType :
			never :
	T extends {[key: string]: AllowedStructureFormat} ?
		StructureToObject<T> :
never;

type RecursivePartial<T extends object> = {
	[K in keyof T]?: RecursivePartialItem<T[K]>;
}

type RecursivePartialItem<T> =
	T extends (infer U)[] ? RecursivePartialItem<U>[] :
	T extends UuidString ? T :
	T extends object ? RecursivePartial<T> :
	T;
