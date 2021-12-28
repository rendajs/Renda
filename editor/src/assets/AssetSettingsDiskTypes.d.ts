import type {UuidString} from "../../../src/mod.js";
import {AssetLinkConfig} from "./DefaultAssetLink.js";

type AssetSettingsDiskData = {
	assets?: {
		[x: UuidString]: AssetSettingsAssetDiskData,
	},
	defaultAssetLinks?: {
		[x: UuidString]: AssetLinkConfig,
	},
}

type AssetSettingsAssetDiskData = {
	path: string[],
	assetSettings?: Object,
}
