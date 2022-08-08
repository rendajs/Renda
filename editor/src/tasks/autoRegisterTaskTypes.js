import {TaskBundleScripts} from "./task/TaskBundleScripts.js";

/** @type {(new (...args: any) => import("./task/Task.js").Task)[]} */
const autoRegisterTaskTypes = [TaskBundleScripts];
export {autoRegisterTaskTypes};
