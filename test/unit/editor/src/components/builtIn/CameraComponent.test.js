import {assertEquals, assertNotEquals} from "std/testing/asserts.ts";
import {assertSpyCalls, spy} from "std/testing/mock.ts";
import {CameraComponent, Mat4} from "../../../../../../src/mod.js";

Deno.test({
	name: "updateProjectionMatrixIfEnabled()",
	fn() {
		const component = new CameraComponent();

		function getMat() {
			return component.projectionMatrix.getFlatArray();
		}

		/**
		 * @param {(value: number) => void} fn
		 */
		function updateValueTest(fn) {
			const matrix1 = getMat();
			fn(123);
			assertEquals(matrix1, getMat());
			component.updateProjectionMatrixIfEnabled();
			assertNotEquals(matrix1, getMat());

			const matrix2 = getMat();
			component.autoUpdateProjectionMatrix = false;
			fn(90);
			component.updateProjectionMatrixIfEnabled();
			assertEquals(matrix2, getMat());

			// Verify that matrix isn't updated unnecessarily when nothing changed
			const createMatSpy = spy(Mat4, "createDynamicAspectPerspective");
			try {
				component.autoUpdateProjectionMatrix = true;
				fn(123);
				component.updateProjectionMatrixIfEnabled();
				assertSpyCalls(createMatSpy, 1);
				const matrix3 = getMat();
				fn(123);
				component.updateProjectionMatrixIfEnabled();
				assertEquals(matrix3, getMat());
				assertSpyCalls(createMatSpy, 1);
			} finally {
				createMatSpy.restore();
			}
		}

		updateValueTest(value => {
			component.fov = value;
		});
		updateValueTest(value => {
			component.clipNear = value;
		});
		updateValueTest(value => {
			component.clipFar = value;
		});
		updateValueTest(value => {
			component.aspectRatio = value;
		});
	},
});
