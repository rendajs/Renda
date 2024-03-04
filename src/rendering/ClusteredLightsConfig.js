import { Vec3 } from "../math/Vec3.js";

export class ClusteredLightsConfig {
	constructor({
		clusterCount = [16, 9, 24],
		maxLightsPerClusterPass = 10,
	} = {}) {
		this.clusterCount = new Vec3(clusterCount);
		this.totalClusterCount = this.clusterCount.x * this.clusterCount.y * this.clusterCount.z;
		this.maxLightsPerClusterPass = maxLightsPerClusterPass;
	}

	getShaderDefines() {
		return {
			"totalClusterCount": String(this.totalClusterCount),
			"maxLightsPerClusterPass": String(this.maxLightsPerClusterPass),
			"clusterCountX": String(this.clusterCount.x),
			"clusterCountY": String(this.clusterCount.y),
			"clusterCountZ": String(this.clusterCount.z),
		};
	}
}
