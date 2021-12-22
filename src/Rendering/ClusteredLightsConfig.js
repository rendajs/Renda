import {Vec3} from "../Math/Vec3.js";

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
			"totalClusterCount": this.totalClusterCount,
			"maxLightsPerClusterPass": this.maxLightsPerClusterPass,
			"clusterLightIndicesStride": this.maxLightsPerClusterPass * 4 + 4,
			"clusterCountX": this.clusterCount.x,
			"clusterCountY": this.clusterCount.y,
			"clusterCountZ": this.clusterCount.z,
		};
	}
}
