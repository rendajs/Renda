struct ClusterLightIndices {
	lightCount : u32;
	indices : [[stride(4)]] array<u32, ${maxLightsPerClusterPass}>;
};
struct ClusterLightIndicesArray {
	clusters : [[stride(${clusterLightIndicesStride})]] array<ClusterLightIndices, ${totalClusterCount}>;
};
[[group(1), binding(1)]] var<storage,write> clusterLightIndices : ClusterLightIndicesArray;
