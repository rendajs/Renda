export function computeClusterBoundsShaderCode({totalTileCount, tileCountX, tileCountY, tileCountZ}){
	return`

[[builtin(global_invocation_id)]] var<in> global_id : vec3<u32>;

const tileCount : vec3<u32> = vec3<u32>(${tileCountX}u, ${tileCountY}u, ${tileCountZ}u);

[[block]] struct ViewUniforms {
	[[offset(0)]] screenSize : vec4<f32>;
	[[offset(16)]] projectionMatrix : mat4x4<f32>;
	[[offset(80)]] inverseProjectionMatrix : mat4x4<f32>;
};
[[group(0), binding(0)]] var<uniform> viewUniforms : ViewUniforms;

[[block]] struct ClusterAABB {
	[[offset(0)]] min : vec3<f32>;
	[[offset(16)]] max : vec3<f32>;
};
[[block]] struct ClusterBounds {
	[[offset(0)]] bounds : [[stride(32)]] array<ClusterAABB, ${totalTileCount}>;
};
[[group(1), binding(0)]] var<storage> clusterBounds : ClusterBounds;

fn screen2View(screen : vec4<f32>) -> vec3<f32> {
	const clip : vec4<f32> = vec4<f32>(screen.xy * 2.0 - vec2<f32>(1.0, 1.0), screen.zw);
	var view : vec4<f32> = viewUniforms.inverseProjectionMatrix * clip;
	view = view / vec4<f32>(view.w, view.w, view.w, view.w);
	return view.xyz;
}

[[stage(compute)]]
fn main() -> void {
	const tileSize : vec3<f32> = vec3<f32>(1.0, 1.0, 1.0) / vec3<f32>(tileCount.xyz);

	const minPointScreen : vec4<f32> = vec4<f32>(vec2<f32>(global_id.xy) * tileSize.xy, 1.0, 1.0);
	const maxPointScreen : vec4<f32> = vec4<f32>((vec2<f32>(global_id.xy) + vec2<f32>(1.0, 1.0)) * tileSize.xy, 1.0, 1.0);

	const minPointView : vec3<f32> = screen2View(minPointScreen);
	const maxPointView : vec3<f32> = screen2View(maxPointScreen);

	const tileNear : f32 = f32(global_id.z) * tileSize.z;
	const tileFar : f32 = f32(global_id.z + 1u) * tileSize.z;

	const minNear : vec3<f32> = minPointView * tileNear;
	const maxNear : vec3<f32> = maxPointView * tileNear;
	const minFar : vec3<f32> = minPointView * tileFar;
	const maxFar : vec3<f32> = maxPointView * tileFar;

	const tileIndex : u32 = global_id.x + global_id.y * tileCount.x + global_id.z * tileCount.x * tileCount.y;
	clusterBounds.bounds[tileIndex].min = min(min(minNear, maxNear),min(minFar, maxFar));
	clusterBounds.bounds[tileIndex].max = max(max(minNear, maxNear),max(minFar, maxFar));
	return;
}
`
};
