import {TaskPropertiesAssetContent} from "../../propertiesAssetContent/TaskPropertiesAssetContent.js";
import {ProjectAssetType} from "./ProjectAssetType.js";

/**
 * @typedef TaskProjectAssetDiskData
 * @property {string} taskType
 * @property {unknown} [taskConfig]
 */

/**
 * @extends {ProjectAssetType<null, null, TaskProjectAssetDiskData, null>}
 */
export class TaskProjectAssetType extends ProjectAssetType {
	static type = "JJ:task";
	static typeUuid = "b642e924-6aa4-47e1-a38e-65d7c10d3033";
	static newFileName = "New Task";
	static propertiesAssetContentConstructor = TaskPropertiesAssetContent;
}
