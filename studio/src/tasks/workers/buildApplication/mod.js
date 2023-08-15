import {TypedMessenger} from "../../../../../src/util/TypedMessenger.js";

/** @typedef {typeof responseHandlers} BuildApplicationMessengerResponseHandlers */

/** @type {TypedMessenger<BuildApplicationMessengerResponseHandlers, import("../../task/TaskBuildApplication.js").BuildApplicationMessengerResponseHandlers, true>} */
const messenger = new TypedMessenger({returnTransferSupport: true});

const responseHandlers = {
	/**
	 * @param {number} contextId
	 * @param {import("../../task/TaskBuildApplication.js").TaskBuildApplicationConfig | undefined} config
	 */
	async buildApplication(contextId, config) {
		if (!config?.entryPoint) {
			throw new Error("Failed to run task, no entry point provided.");
		}
		if (!config.outputDir) {
			throw new Error("Failed to run task: no outputDir provided.");
		}

		// TODO: We're only getting uuids from the main entry point right now,
		// but we'll want to check all imports recursively for uuids as well.
		const javascript = await messenger.send.readJavaScript(contextId, config.entryPoint);
		/** @type {string[]} */
		const usedAssetsUuids = [];
		if (javascript) {
			const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gmi;
			for (const match of javascript.matchAll(uuidRegex)) {
				usedAssetsUuids.push(match[0]);
			}
		}

		/** @type {import("../../task/Task.js").RunTaskCreateAssetData[]} */
		const writeAssets = [];

		const {servicesScript, usedAssets: usedServicesAssets} = await messenger.send.generateServices({
			contextId,
			usedAssetsUuids,
			entryPointUuids: [config.entryPoint],
		});
		for (const assetUuid of usedServicesAssets) {
			usedAssetsUuids.push(assetUuid);
		}

		const assetBundle = await messenger.send.bundleAssets(contextId, usedAssetsUuids);
		writeAssets.push({
			fileData: assetBundle,
			path: [...config.outputDir, "bundle.rbundle"],
		});

		const scriptBundle = await messenger.send.bundleScripts(contextId, config.entryPoint, servicesScript);
		if (!scriptBundle.writeAssets || scriptBundle.writeAssets.length == 0) {
			throw new Error("Failed to run task: bundling scripts resulted in no output.");
		}
		for (const script of scriptBundle.writeAssets) {
			writeAssets.push({
				fileData: script.fileData,
				path: [...config.outputDir, ...script.path],
			});
		}
		const castWriteAssets = /** @type {import("../../task/Task.js").RunTaskCreateAssetData<import("../bundleScripts/bundle.js").RunTaskCreateAssetBundleScriptsCustomData>[]} */ (scriptBundle.writeAssets);
		const bundledEntryPoints = castWriteAssets.filter(a => a.customData?.isEntry);
		if (bundledEntryPoints.length != 1) {
			throw new Error("Assertion failed: bundled scripts contain more than one entry point");
		}
		const bundledEntryPoint = bundledEntryPoints[0].path;

		const html = await messenger.send.generateHtml(contextId, bundledEntryPoint.join("/"));
		writeAssets.push({
			fileData: html,
			path: [...config.outputDir, "index.html"],
		});

		/** @type {import("../../task/Task.js").RunTaskReturn} */
		const taskResult = {writeAssets};

		/** @type {import("../../../../../src/util/TypedMessenger.js").RequestHandlerReturn} */
		const requestResult = {
			returnValue: taskResult,
		};
		return requestResult;
	},
};

messenger.initialize(globalThis, responseHandlers);
