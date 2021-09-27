export default class DefaultAssetLink {
	constructor({
		name = "",
		defaultAssetUuid = null,
		originalAssetUuid = null,
		builtInOriginalAssetUuid = null,
	} = {}) {
		this.name = name;
		this.defaultAssetUuid = defaultAssetUuid;
		this.originalAssetUuid = originalAssetUuid;
		this.builtInOriginalAssetUuid = builtInOriginalAssetUuid;
		this.isBuiltIn = false;
	}

	setBuiltIn(builtIn, builtInOriginalAssetUuid) {
		this.isBuiltIn = builtIn;
		this.builtInOriginalAssetUuid = builtInOriginalAssetUuid;
	}

	setUserData({name, originalAssetUuid}) {
		if (!this.isBuiltIn) {
			this.name = name;
		}
		this.originalAssetUuid = originalAssetUuid;
	}

	toJson() {
		const json = {};
		if (this.isBuiltIn) {
			if (this.originalAssetUuid == this.builtInOriginalAssetUuid) return null;
		} else if (this.name) {
			json.name = this.name;
		}
		if (this.originalAssetUuid) json.originalAssetUuid = this.originalAssetUuid;
		return json;
	}
}
