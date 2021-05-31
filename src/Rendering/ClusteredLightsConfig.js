import {Vec3} from "../index.js";

export default class ClusteredLightsConfig{
	constructor({
		clusterCount = [16,9,24],
		maxLightsPerClusterPass = 10,
	}){
		this.clusterCount = new Vec3(clusterCount);
		this.maxLightsPerClusterPass = maxLightsPerClusterPass;
	}
}
