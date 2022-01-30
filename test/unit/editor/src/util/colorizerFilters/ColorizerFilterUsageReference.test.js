import {assertEquals} from "asserts";
import {ColorizerFilterUsageReference} from "../../../../../../editor/src/util/colorizerFilters/ColorizerFilterUsageReference.js";

Deno.test("Destructor should notify the filter", () => {
	let notifyCallCount = 0;
	const mockFilter = /** @type {any} */ ({
		notifyReferenceDestructed: () => {
			notifyCallCount++;
		},
	});
	const usageRef = new ColorizerFilterUsageReference(mockFilter);

	usageRef.destructor();

	assertEquals(notifyCallCount, 1);
	assertEquals(usageRef.destructed, true);
});

Deno.test("Destructor should only be callable once", () => {
	let notifyCallCount = 0;
	const mockFilter = /** @type {any} */ ({
		notifyReferenceDestructed: () => {
			notifyCallCount++;
		},
	});
	const usageRef = new ColorizerFilterUsageReference(mockFilter);

	usageRef.destructor();
	usageRef.destructor();

	assertEquals(notifyCallCount, 1);
	assertEquals(usageRef.destructed, true);
});
