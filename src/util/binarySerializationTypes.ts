import type { AllStorageTypes, StorageTypeEnum } from "./mod";
import type { UuidString } from "./util";

export type AllowedStructureFormat = AllStorageTypes | [AllowedStructureFormat] | AllowedStructureFormat[] | { [key: string]: AllowedStructureFormat } | readonly string[];

export type StructureToObject<T extends AllowedStructureFormat> = {
	[key in keyof T]: T[key] extends AllowedStructureFormat ? StructureItemToObject<T[key]> : never;
}

export type StructureItemToObject<T extends AllowedStructureFormat> =
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
	T extends StorageTypeEnum["ASSET_UUID"] ? UuidString :
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
