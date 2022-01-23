import {ProjectAssetType} from "./ProjectAssetType.js";
import {PropertiesAssetContentAssetBundle} from "../../propertiesWindowContent/propertiesAssetContent/PropertiesAssetContentAssetBundle.js";

/**
 * @typedef {Object} AssetBundleDiskData
 * @property {string} outputLocation
 * @property {AssetBundleDiskDataAsset[]} assets
 * @property {(import("../../../../src/util/mod.js").UuidString?)[]} excludeAssets
 * @property {(import("../../../../src/util/mod.js").UuidString?)[]} excludeAssetsRecursive
 */

/**
 * @typedef {Object} AssetBundleDiskDataAsset
 * @property {import("../../../../src/util/mod.js").UuidString?} asset
 * @property {boolean} includeChildren
 */

/**
 * @extends {ProjectAssetType<null, null, AssetBundleDiskData>}
 */
export class ProjectAssetTypeAssetBundle extends ProjectAssetType {
	static type = "JJ:assetBundle";
	static typeUuid = "f5a6f81c-5404-4d0a-9c57-2a751699cc5c";
	static newFileName = "New AssetBundle";
	static propertiesAssetContentConstructor = PropertiesAssetContentAssetBundle;
}
