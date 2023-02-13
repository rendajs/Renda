export function getBasicRunTaskReadAssetOptions() {
	return {
		/**
		 * @template {import("../../../../../../studio/src/assets/AssetManager.js").AssetAssertionOptions} T
		 * @param {import("../../../../../../studio/src/util/fileSystems/EditorFileSystem.js").EditorFileSystemPath} path
		 * @param {T} [assertionOptions]
		 */
		async readAssetFromPath(path, assertionOptions) {
			return /** @type {import("../../../../../../studio/src/assets/AssetManager.js").AssetAssertionOptionsToReadAssetDataReturn<T>} */ (null);
		},
		/**
		 * @template {import("../../../../../../studio/src/assets/AssetManager.js").AssetAssertionOptions} T
		 * @param {import("../../../../../../src/mod.js").UuidString} uuid
		 * @param {T} [assertionOptions]
		 */
		async readAssetFromUuid(uuid, assertionOptions) {
			return /** @type {import("../../../../../../studio/src/assets/AssetManager.js").AssetAssertionOptionsToReadAssetDataReturn<T>} */ (null);
		},
		/** @type {import("../../../../../../studio/src/tasks/task/Task.js").RunTaskOptions<any>["runDependencyTaskAsset"]} */
		async runDependencyTaskAsset(uuid) {},
		/** @type {import("../../../../../../studio/src/tasks/task/Task.js").RunTaskOptions<any>["runChildTask"]} */
		async runChildTask(type, config, options) {
			throw new Error("Not implemented");
		},
	};
}
