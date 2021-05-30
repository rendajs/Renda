struct ClusterLightIndices {
	lightCount : u32;
	indices : [[stride(4)]] array<u32, 10>; //todo: don't hardcode lightcount
};
[[block]] struct ClusterLightIndicesArray {
	clusters : [[stride(44)]] array<ClusterLightIndices, 3456>; //todo, don't hard code clustercount and stride
};
[[group(1), binding(1)]] var<storage> clusterLightIndices : [[access(write)]] ClusterLightIndicesArray;
