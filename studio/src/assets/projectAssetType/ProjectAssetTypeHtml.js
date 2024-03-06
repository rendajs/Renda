import { ProjectAssetType } from "./ProjectAssetType.js";

/**
 * @extends {ProjectAssetType<null, null, string>}
 */
export class ProjectAssetTypeHtml extends ProjectAssetType {
	static type = "renda:html";
	static typeUuid = "7e438c29-3a58-4662-948f-754370ca1ef0";
	static matchExtensions = ["html", "htm"];
	static storeInProjectAsJson = false;
	static storeInProjectAsText = true;
}
