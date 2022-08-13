import {PropertiesAssetContentTask} from "../../propertiesAssetContent/PropertiesAssetContentTask.js";
import {ProjectAssetType} from "./ProjectAssetType.js";

/**
 * @typedef TaskProjectAssetDiskData
 * @property {string} taskType
 * @property {unknown} [taskConfig]
 */

/**
 * @extends {ProjectAssetType<null, null, TaskProjectAssetDiskData, null>}
 */
export class ProjectAssetTypeTask extends ProjectAssetType {
	static type = "renda:task";
	static typeUuid = "b642e924-6aa4-47e1-a38e-65d7c10d3033";
	static newFileName = "New Task";
	static propertiesAssetContentConstructor = PropertiesAssetContentTask;
}
