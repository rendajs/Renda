import type {UuidString} from "../../../src/mod.js";
import {AssetLinkConfig} from "./DefaultAssetLink.js";

type InternallyCreatedAssetDiskData = {
	uuid: UuidString;
	persistenceData: unknown;
}

type AssetSettingsDiskData = {
	assets?: {
		[x: UuidString]: AssetSettingsAssetDiskData,
	},
	internallyCreatedAssets?: InternallyCreatedAssetDiskData[],
	defaultAssetLinks?: {
		[x: UuidString]: AssetLinkConfig,
	},
}

type AssetSettingsAssetDiskData = {
	path: string[],
	assetSettings?: Object,
}
