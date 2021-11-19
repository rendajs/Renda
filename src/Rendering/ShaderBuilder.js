/**
 * @typedef {Object} ShaderLibraryItem
 * @property {string} shaderCode
 * @property {string} builtCode
 * @property {import("../../editor/src/Util/Util.js").UuidString[]} includedUuids
 */

/**
 * @typedef {(uuid: import("../../editor/src/Util/Util.js").UuidString) => Promise<string>} ShaderUuidRequestedHook
 */

export class ShaderBuilder {
	constructor() {
		/** @type {Map<import("../../editor/src/Util/Util.js").UuidString, ShaderLibraryItem>} */
		this.shaderLibrary = new Map();
		/** @type {Set<ShaderUuidRequestedHook>} */
		this.onShaderUuidRequestedCbs = new Set();
		this.onShaderInvalidatedCbs = new Set();
	}

	/**
	 * @param {import("../../editor/src/Util/Util.js").UuidString} uuid
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
	 * @param {import("../../editor/src/Util/Util.js").UuidString} uuid
	 */
	invalidateShader(uuid) {
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
		/** @type {import("../../editor/src/Util/Util.js").UuidString[]} */
		const includedUuids = [];
		const attemptedUuids = [];

		/* eslint-disable indent */
		let re = "^\\s*"; // Allow whitespaces at the beginning
		re += "#include"; // `#include` prefix
		re += "\\s+"; // At least one whitespace
		re += "(?:"; // Start main include
			re += "(?<uuid>[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})"; // Capture uuid
			re += "|"; // Or
			re += "(?<path>\".*\")"; // Capture path
		re += ")"; // End main include
		/* eslint-enable indent */
		const regex = new RegExp(re, "gm");
		shaderCode = await this.replaceAllAsync(shaderCode, regex, async match => {
			const uuid = match.groups["uuid"];
			if (attemptedUuids.includes(uuid)) return "";
			attemptedUuids.push(uuid);
			const block = await this.getShaderBlock(uuid);
			if (block) {
				includedUuids.push(uuid);
				return block;
			}
			return "";
		});
		return {shaderCode, includedUuids};
	}

	/**
	 * @param {string} str
	 * @param {RegExp} regex
	 * @param {(match: *) => Promise<str>} replaceFunction
	 */
	async replaceAllAsync(str, regex, replaceFunction) {
		const promises = [];
		const replaceIndices = [];
		const replaceLengths = [];
		let flags = regex.flags;
		if (!flags.includes("g")) flags += "g";
		const regexClone = new RegExp(regex.source, flags);
		for (const match of str.matchAll(regexClone)) {
			const promise = replaceFunction(match);
			promises.push(promise);
			replaceIndices.push(match.index);
			replaceLengths.push(match[0].length);
		}
		const replaceStrings = await Promise.all(promises);
		let result = str;
		for (let i = replaceIndices.length - 1; i >= 0; i--) {
			const index = replaceIndices[i];
			const length = replaceLengths[i];
			const replaceString = replaceStrings[i];
			result = result.substring(0, index) + replaceString + result.substring(index + length);
		}
		return result;
	}

	/**
	 * @param {import("../../editor/src/Util/Util.js").UuidString} uuid
	 * @param {Object} options
	 * @param {boolean} [options.buildRecursive]
	 */
	async getShaderBlock(uuid, {
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
	 * @param {import("../../editor/src/Util/Util.js").UuidString} uuid
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
	 * @param {import("../../editor/src/Util/Util.js").UuidString} uuid
	 */
	async fireShaderUuidRequested(uuid) {
		/**
		 * @typedef {Object} PromiseItem
		 * @property {boolean} resolved
		 * @property {string} result
		 * @property {Promise<string>} promise
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
		/** @type {string} */
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

	onShaderInvalidated(cb) {
		this.onShaderInvalidatedCbs.add(cb);
	}

	removeShaderInvalidated(cb) {
		this.onShaderInvalidatedCbs.delete(cb);
	}

	fireOnShaderInvalidated(uuid) {
		for (const cb of this.onShaderInvalidatedCbs) {
			cb(uuid);
		}
	}

	static fillShaderDefines(shaderCode, defines) {
		for (const [key, value] of Object.entries(defines)) {
			shaderCode = shaderCode.replaceAll("${" + key + "}", value);
		}
		return shaderCode;
	}
}
