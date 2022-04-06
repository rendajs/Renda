import {AssetLoaderType} from "./AssetLoaderType.js";
import {ShaderSource} from "../../rendering/ShaderSource.js";

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
	 */
	async parseBuffer(buffer, {
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
			createNewInstance: true, // todo: is this necessary?
		});
		return shader;
	}
}
