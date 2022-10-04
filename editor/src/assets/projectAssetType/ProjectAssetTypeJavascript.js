import {ProjectAssetType} from "./ProjectAssetType.js";

/**
 * @extends {ProjectAssetType<null, null, string>}
 */
export class ProjectAssetTypeJavascript extends ProjectAssetType {
	static type = "renda:javascript";
	static typeUuid = "3654355b-9c4c-4ac0-b3d7-81565208ec0f";
	static newFileName = "New Script";
	static newFileExtension = "js";
	static storeInProjectAsJson = false;
	static storeInProjectAsText = true;
}
