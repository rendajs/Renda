import type { Vec3 } from "./Vec3.js";

export type GetFirstParam<T> = T extends [infer P] ? P : never;

/**
 * Takes multiple signatures and resolves to a union of all parameters with
 * one extra signature added that is a union of all signatures with only a
 * single parameter. The added signature takes only one parameter, which is
 * the union of first parameters.
 */
export type MergeParameters<T extends (...args: any) => any> = Parameters<T> | [GetFirstParam<Parameters<T>>];

export interface RaycastResult {
	pos: Vec3;
	dist: number;
}

export interface RaycastShape {
	raycast(start: Vec3, dir: Vec3): RaycastResult | null;
}
