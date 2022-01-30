struct ClusterLightIndices {
	lightCount : u32;
	indices: array<u32, ${maxLightsPerClusterPass}>;
};
struct ClusterLightIndicesArray {
	clusters: array<ClusterLightIndices, ${totalClusterCount}>;
};
@group(1) @binding(1)
var<storage,write> clusterLightIndices : ClusterLightIndicesArray;
