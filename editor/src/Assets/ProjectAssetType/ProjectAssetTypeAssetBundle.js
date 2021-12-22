import {ProjectAssetType} from "./ProjectAssetType.js";
import {PropertiesAssetContentAssetBundle} from "../../PropertiesWindowContent/PropertiesAssetContent/PropertiesAssetContentAssetBundle.js";

/**
 * @typedef {Object} AssetBundleDiskData
 * @property {string} outputLocation
 * @property {AssetBundleDiskDataAsset[]} assets
 * @property {import("../../Util/Util.js").UuidString[]} excludeAssets
 * @property {import("../../Util/Util.js").UuidString[]} excludeAssetsRecursive
 */

/**
 * @typedef {Object} AssetBundleDiskDataAsset
 * @property {import("../../Util/Util.js").UuidString} asset
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
