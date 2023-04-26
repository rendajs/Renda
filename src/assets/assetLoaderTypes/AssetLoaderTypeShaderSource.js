import {AssetLoaderType} from "./AssetLoaderType.js";
import {ShaderSource} from "../../rendering/ShaderSource.js";

// TODO: Make the return type a generic based on whether 'raw' was true.

/**
 * @extends {AssetLoaderType<ShaderSource | string>}
 */
export class AssetLoaderTypeShaderSource extends AssetLoaderType {
	static get typeUuid() {
		return "e7253ad6-8459-431f-ac16-609150538a24";
	}

	/**
	 * @param  {ConstructorParameters<typeof AssetLoaderType>} args
	 */
	constructor(...args) {
		super(...args);

		this.builder = null;
		this.boundOnShaderUuidRequested = this.onShaderUuidRequested.bind(this);
	}

	/**
	 * @override
	 * @param {ArrayBuffer} buffer
	 * @param {import("../RecursionTracker.js").RecursionTracker} recursionTracker
	 */
	async parseBuffer(buffer, recursionTracker, {
		raw = false,
	} = {}) {
		const decoder = new TextDecoder();
		const shaderCode = decoder.decode(buffer);
		if (this.builder && !raw) {
			const {shaderCode: newShaderCode} = await this.builder.buildShader(shaderCode);
			return new ShaderSource(newShaderCode);
		} else {
			return shaderCode;
		}
	}

	/**
	 * @param {import("../../rendering/ShaderBuilder.js").ShaderBuilder} builder
	 */
	setBuilder(builder) {
		if (this.builder) {
			// todo: also remove this in the destructor of AssetLoaderTypeShader
			this.builder.removeOnShaderUuidRequested(this.boundOnShaderUuidRequested);
		}
		this.builder = builder;
		this.builder.onShaderUuidRequested(this.boundOnShaderUuidRequested);
	}

	/**
	 * @param {import("../../util/util.js").UuidString} uuid
	 */
	async onShaderUuidRequested(uuid) {
		const shader = await this.assetLoader.getAsset(uuid, {
			assetOpts: {raw: true},
			// createNewInstance is required because this will return a raw string
			// and raw strings can't be cached used WeakRefs
			createNewInstance: true,
		});
		if (typeof shader != "string") {
			throw new Error("Tried to load a shader but the resolved asset is not a string. Did you @import the wrong uuid?");
		}
		return shader;
	}
}
