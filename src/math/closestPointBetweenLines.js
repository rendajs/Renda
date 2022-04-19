import {Vec3} from "./Vec3.js";

/**
 * Takes two lines and returns a point on the first line that is closest to the second line.
 * If the two lines are parellel, or overlapping, the result will be the first position.
 *
 * @param {import("./Vec3.js").Vec3} pos1
 * @param {import("./Vec3.js").Vec3} dir1
 * @param {import("./Vec3.js").Vec3} pos2
 * @param {import("./Vec3.js").Vec3} dir2
 */
export function closestPointBetweenLines(pos1, dir1, pos2, dir2) {
	// https://math.stackexchange.com/a/3436386/767596
	const dir1Normalised = dir1.clone().normalize();
	const dir2Normalised = dir2.clone().normalize();

	// If the two lines overlap or are parellel, the result will be the first position.
	if (dir2Normalised.dot(dir1Normalised) == 1) {
		return pos1.clone();
	}

	const cross = Vec3.cross(dir1Normalised, dir2Normalised).normalize();
	const deltaPos = pos1.clone().sub(pos2);

	// If the two positions are the same, the lines intersect on either the first or second position.
	if (deltaPos.magnitude == 0) {
		return pos1.clone();
	}

	const dir2Projection = deltaPos.clone().projectOnVector(dir2Normalised);
	const crossProjection = deltaPos.clone().projectOnVector(cross);

	const rejection = deltaPos.clone().sub(dir2Projection).sub(crossProjection);
	if (rejection.magnitude == 0) {
		// TODO: I think there's a better approach to compute the closest point:
		// - create a plane with normal dir1 and pos pos1
		// - project pos2 and dir2 onto this plane
		// - now the problem is 2d: get the closest point from point to a line.
		// This problem is easier, get the normal of the 2d line and create a
		// second line that goes through the point, then compute the intersection.
		// - Now create a new 3d line perpendicular to the plane, that starts at
		// the computed intersection.
		// - Compute the intersection between the new line and line2.
		throw new Error("This edge case is not yet implemented.");
	}
	const t = -rejection.magnitude / dir1Normalised.dot(rejection.clone().normalize());
	const closestPoint = pos1.clone().add(dir1Normalised.clone().multiply(t));
	return closestPoint;
}
