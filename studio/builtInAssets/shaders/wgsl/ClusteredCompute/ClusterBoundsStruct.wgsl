struct ClusterAABB {
	min : vec3<f32>,
	max : vec3<f32>,
};
struct ClusterBoundsArray {
	bounds: array<ClusterAABB, ${totalClusterCount}>,
};
@group(1) @binding(0)
var<storage,read_write> clusterBounds : ClusterBoundsArray;
