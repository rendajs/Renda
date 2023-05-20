import type {UuidString} from "../../../src/mod.js";
import {AssetLinkConfig} from "./DefaultAssetLink.js";

export type InternallyCreatedAssetDiskData = {
	uuid: UuidString;
	persistenceData: unknown;
}

export type AssetSettingsDiskData = {
	assets?: {
		[x: UuidString]: AssetSettingsAssetDiskData,
	},
	internallyCreatedAssets?: InternallyCreatedAssetDiskData[],
	defaultAssetLinks?: {
		[x: UuidString]: AssetLinkConfig,
	},
}

export type AssetSettingsAssetDiskData = {
	path: string[],
	assetSettings?: Object,
}
