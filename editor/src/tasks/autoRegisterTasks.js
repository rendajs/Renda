import {TaskBundleScripts} from "./task/TaskBundleScripts.js";

/** @type {import("./task/Task.js").TaskConstructor[]} */
const autoRegisterTasks = [TaskBundleScripts];
export {autoRegisterTasks};
