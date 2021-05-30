struct ClusterAABB {
	min : vec3<f32>;
	max : vec3<f32>;
};
[[block]] struct ClusterBoundsArray {
	bounds : [[stride(32)]] array<ClusterAABB, 3456>; //todo: don't hardcode clusterCount
};
[[group(1), binding(0)]] var<storage> clusterBounds : [[access(write)]] ClusterBoundsArray;
