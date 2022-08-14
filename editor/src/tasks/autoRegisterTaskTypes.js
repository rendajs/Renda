import {TaskBundleAssets} from "./task/TaskBundleAssets.js";
import {TaskBundleScripts} from "./task/TaskBundleScripts.js";
import {TaskGenerateServices} from "./task/TaskGenerateServices.js";

/** @type {(new (...args: any) => import("./task/Task.js").Task)[]} */
const autoRegisterTaskTypes = [
	TaskBundleAssets,
	TaskBundleScripts,
	TaskGenerateServices,
];
export {autoRegisterTaskTypes};
