struct ClusterLightIndices {
	lightCount : u32,
	indices: array<u32, ${maxLightsPerClusterPass}>,
};
struct ClusterLightIndicesArray {
	clusters: array<ClusterLightIndices, ${totalClusterCount}>,
};
@group(0) @binding(2)
var<storage,read_write> clusterLightIndices : ClusterLightIndicesArray;
