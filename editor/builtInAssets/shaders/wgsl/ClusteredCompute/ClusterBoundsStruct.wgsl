struct ClusterAABB {
	min : vec3<f32>;
	max : vec3<f32>;
};
struct ClusterBoundsArray {
	bounds : [[stride(32)]] array<ClusterAABB, ${totalClusterCount}>;
};
[[group(1), binding(0)]] var<storage,write> clusterBounds : ClusterBoundsArray;
