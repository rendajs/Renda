import defaultAssetLoader from "./defaultAssetLoader.js";
import {ENGINE_ASSETS_LIVE_UPDATES_SUPPORT} from "../engineDefines.js";

export default class EngineAssetsManager {
	constructor() {
		if (!ENGINE_ASSETS_LIVE_UPDATES_SUPPORT) return;
		this.getAssetHandlers = new Set();

		this.watchingAssetCbs = new Map(); // <uuid, Set<cb>>
	}

	async getAsset(...args) {
		if (ENGINE_ASSETS_LIVE_UPDATES_SUPPORT) {
			for (const handler of this.getAssetHandlers) {
				const result = await handler(...args);
				if (result) return result;
			}
		}
		return await defaultAssetLoader.getAsset(...args);
	}

	async watchAsset(uuid, onAssetChangeCb) {
		const asset = await this.getAsset(uuid);
		onAssetChangeCb(asset);
		if (ENGINE_ASSETS_LIVE_UPDATES_SUPPORT) {
			let cbs = this.watchingAssetCbs.get(uuid);
			if (!cbs) {
				cbs = new Set();
				this.watchingAssetCbs.set(uuid, cbs);
			}
			cbs.add(onAssetChangeCb);
		}
	}

	addGetAssetHandler(handlerFunction) {
		if (!ENGINE_ASSETS_LIVE_UPDATES_SUPPORT) return;
		this.getAssetHandlers.add(handlerFunction);
	}

	async notifyAssetChanged(uuid) {
		if (!ENGINE_ASSETS_LIVE_UPDATES_SUPPORT) return;
		const cbs = this.watchingAssetCbs.get(uuid);
		if (cbs) {
			const asset = await this.getAsset(uuid);
			for (const cb of cbs) {
				cb(asset);
			}
		}
	}
}
