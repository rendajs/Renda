export default class ShaderBuilder{
	constructor(){
		this.shaderLibrary = new Map();
		this.onShaderUuidRequestedCbs = new Set();
	}

	addShader(uuid, shaderCode){
		this.shaderLibrary.set(uuid, {
			shaderCode,
			builtCode: null,
		});
	}

	async buildShader(shaderCode){
		const regex = /^\s*#include\s(?<uuid>.+?):?(?::(?<params>.+)|$)/gm;
		shaderCode = await this.replaceAsync(shaderCode, regex, async (match, p1, p2, offset, str, groups) => {
			const block = await this.getShaderBlock(groups.uuid, {
				params: groups.params,
			});
			return block || "";
		});
		return shaderCode;
	}

	async replaceAsync(str, regex, fn){
		const promises = [];
		str.replace(regex, (...args) => {
			const promise = fn(...args);
			promises.push(promise);
		});
		const replaceData = await Promise.all(promises);
		return str.replace(regex, _ => replaceData.shift());
	}

	async getShaderBlock(uuid, {
		params = null,
		buildRecursive = true,
	} = {}){
		//todo, get only specific part of shader
		const shaderData = await this.getShader(uuid);
		if(buildRecursive){
			if(shaderData.builtCode){
				return shaderData.builtCode;
			}else{
				shaderData.builtCode = await this.buildShader(shaderData.shaderCode);
				return shaderData.builtCode;
			}
		}else{
			return shaderData.shaderCode;
		}
	}

	async getShader(uuid){
		if(!this.shaderLibrary.has(uuid)){
			await this.fireShaderUuidRequested(uuid);
		}
		return this.shaderLibrary.get(uuid);
	}

	onShaderUuidRequested(cb){
		this.onShaderUuidRequestedCbs.add(cb);
	}

	async fireShaderUuidRequested(uuid){
		const promises = [];
		let shaderCode = null;
		for(const cb of this.onShaderUuidRequestedCbs){
			const promise = cb(uuid);
			promises.push(promise);
		}
		const foundShaderCodes = await Promise.all(promises);
		let foundShaderCode = null;
		for(const shaderCode of foundShaderCodes){
			if(shaderCode) foundShaderCode = shaderCode;
		}
		if(foundShaderCode){
			this.addShader(uuid, foundShaderCode);
		}
	}
}
