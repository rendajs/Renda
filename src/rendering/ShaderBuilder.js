/**
 * @typedef {object} ShaderLibraryItem
 * @property {string} shaderCode
 * @property {string?} builtCode
 * @property {import("../util/util.js").UuidString[]} includedUuids
 */

/**
 * @typedef {(uuid: import("../util/util.js").UuidString) => Promise<string?>} ShaderUuidRequestedHook
 */

/** @typedef {(uuid: import("../util/util.js").UuidString) => void} OnShaderInvalidatedCallback */

export class ShaderBuilder {
	constructor() {
		/** @type {Map<import("../util/util.js").UuidString, ShaderLibraryItem>} */
		this.shaderLibrary = new Map();
		/** @type {Set<ShaderUuidRequestedHook>} */
		this.onShaderUuidRequestedCbs = new Set();
		/** @type {Set<OnShaderInvalidatedCallback>} */
		this.onShaderInvalidatedCbs = new Set();
	}

	/**
	 * @param {import("../util/util.js").UuidString} uuid
	 * @param {string} shaderCode
	 */
	addShader(uuid, shaderCode) {
		this.shaderLibrary.set(uuid, {
			shaderCode,
			builtCode: null,
			includedUuids: [],
		});
	}

	/**
	 * @param {import("../util/util.js").UuidString?} uuid
	 */
	invalidateShader(uuid) {
		if (!uuid) return;
		this.shaderLibrary.delete(uuid);
		this.fireOnShaderInvalidated(uuid);
		for (const [existingUuid, shader] of this.shaderLibrary) {
			if (shader.includedUuids.includes(uuid)) {
				this.invalidateShader(existingUuid);
			}
		}
	}

	/**
	 * @param {string} shaderCode
	 */
	async buildShader(shaderCode) {
		/** @type {import("../util/util.js").UuidString[]} */
		const includedUuids = [];
		/** @type {import("../util/util.js").UuidString[]} */
		const attemptedUuids = [];
		const regex = /^\s*\/\/\s*@import\s(.+?):?(?::(.+)|$)/gm;
		shaderCode = await this.replaceAsync(shaderCode, regex, async (match, uuid, params) => {
			if (attemptedUuids.includes(uuid)) return "";
			attemptedUuids.push(uuid);
			const block = await this.getShaderBlock(uuid, {params});
			if (block) {
				includedUuids.push(uuid);
				return block;
			}
			return "";
		});
		return {shaderCode, includedUuids};
	}

	/** @typedef {Parameters<typeof String.prototype.replace>[1]} StringReplacerFn */

	/**
	 * @param {string} str
	 * @param {RegExp} regex
	 * @param {(...args: Parameters<StringReplacerFn>) => Promise<string>} fn
	 */
	async replaceAsync(str, regex, fn) {
		/** @type {Promise<string>[]} */
		const promises = [];
		str.replace(regex, (...args) => {
			const promise = fn(...args);
			promises.push(promise);
			return "";
		});
		const replaceData = await Promise.all(promises);
		return str.replace(regex, () => {
			const replaceValue = replaceData.shift();
			return /** @type {string} */ (replaceValue);
		});
	}

	/**
	 * @param {import("../mod.js").UuidString} uuid
	 */
	async getShaderBlock(uuid, {
		params = null,
		buildRecursive = true,
	} = {}) {
		// todo, get only specific part of shader
		const shaderData = await this.getShader(uuid);
		if (!shaderData) {
			throw new Error(`Shader tried to #include uuid ${uuid} but it could not be found`);
		}
		if (buildRecursive) {
			if (shaderData.builtCode) {
				return shaderData.builtCode;
			} else {
				const {shaderCode, includedUuids} = await this.buildShader(shaderData.shaderCode);
				shaderData.builtCode = shaderCode;
				shaderData.includedUuids = includedUuids;
				return shaderData.builtCode;
			}
		} else {
			return shaderData.shaderCode;
		}
	}

	/**
	 * @param {import("../util/util.js").UuidString} uuid
	 */
	async getShader(uuid) {
		if (!this.shaderLibrary.has(uuid)) {
			await this.fireShaderUuidRequested(uuid);
		}
		return this.shaderLibrary.get(uuid);
	}

	/**
	 * @param {ShaderUuidRequestedHook} hook
	 */
	onShaderUuidRequested(hook) {
		this.onShaderUuidRequestedCbs.add(hook);
	}

	/**
	 * @param {ShaderUuidRequestedHook} hook
	 */
	removeOnShaderUuidRequested(hook) {
		this.onShaderUuidRequestedCbs.delete(hook);
	}

	/**
	 * @param {import("../util/util.js").UuidString} uuid
	 */
	async fireShaderUuidRequested(uuid) {
		/**
		 * @typedef {object} PromiseItem
		 * @property {boolean} resolved
		 * @property {string?} result
		 * @property {Promise<string?>?} promise
		 */

		/** @type {PromiseItem[]} */
		let unparsedPromiseItems = [];
		for (const cb of this.onShaderUuidRequestedCbs) {
			/** @type {PromiseItem} */
			const promiseItem = {
				resolved: false,
				result: null,
				promise: null,
			};
			promiseItem.promise = (async () => {
				promiseItem.result = await cb(uuid);
				promiseItem.resolved = true;
				return promiseItem.result;
			})();
			unparsedPromiseItems.push(promiseItem);
		}
		if (unparsedPromiseItems.length <= 0) {
			return;
		}
		/** @type {string?} */
		let foundShaderCode = null;
		while (unparsedPromiseItems.length > 0 && !foundShaderCode) {
			const promises = unparsedPromiseItems.map(i => i.promise);
			try {
				foundShaderCode = await Promise.race(promises);
			} catch (_) {
				// fail silently
			}
			if (foundShaderCode) {
				break;
			} else {
				unparsedPromiseItems = unparsedPromiseItems.filter(p => !p.resolved);
			}
		}
		if (foundShaderCode) {
			this.addShader(uuid, foundShaderCode);
		}
	}

	/**
	 * @param {OnShaderInvalidatedCallback} cb
	 */
	onShaderInvalidated(cb) {
		this.onShaderInvalidatedCbs.add(cb);
	}

	/**
	 * @param {OnShaderInvalidatedCallback} cb
	 */
	removeShaderInvalidated(cb) {
		this.onShaderInvalidatedCbs.delete(cb);
	}

	/**
	 * @param {import("../mod.js").UuidString} uuid
	 */
	fireOnShaderInvalidated(uuid) {
		for (const cb of this.onShaderInvalidatedCbs) {
			cb(uuid);
		}
	}

	/**
	 * @param {string} shaderCode
	 * @param {Object<string, string>} defines
	 */
	static fillShaderDefines(shaderCode, defines) {
		for (const [key, value] of Object.entries(defines)) {
			shaderCode = shaderCode.replaceAll("${" + key + "}", value);
		}
		return shaderCode;
	}
}
