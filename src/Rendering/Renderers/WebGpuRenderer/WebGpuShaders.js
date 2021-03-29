export function computeClusterBoundsShaderCode(totalTileCount){
	return`

[[builtin(global_invocation_id)]] var<in> global_id : vec3<u32>;

[[block]] struct ClusterAABB {
	[[offset(0)]] min : vec3<f32>;
	[[offset(16)]] max : vec3<f32>;
};
[[block]] struct ClusterBounds {
	[[offset(0)]] bounds : [[stride(32)]] array<ClusterAABB, ${totalTileCount}>;
};
[[group(1), binding(0)]] var<storage_buffer> clusterBounds : ClusterBounds;

[[stage(compute)]]
fn main() -> void {
	clusterBounds.bounds[0].min = vec3<f32>(1.0, 1.0, 1.0);
	clusterBounds.bounds[0].max = vec3<f32>(1.0, 1.0, 1.0);
	return;
}
`
};
