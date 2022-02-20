import {assert, assertEquals, assertExists, assertStrictEquals, assertThrows} from "asserts";
import {ComponentGizmosManager} from "../../../../../editor/src/componentGizmos/ComponentGizmosManager.js";
import {CameraComponent} from "../../../../../src/mod.js";
import {Importer} from "fake-imports";

async function basicSetup() {
	const importer = new Importer(import.meta.url);
	importer.fakeModule("../../../../../editor/src/editorInstance.js", `
		export function getEditorInstanceCertain() {
			return {}
		};
	`);
	importer.fakeModule("../../../../../editor/src/componentGizmos/autoRegisterComponentGizmos.js", `
		export const autoRegisterComponentGizmos = [];
	`);
	const {ComponentGizmosManager} = await importer.import("../../../../../editor/src/componentGizmos/ComponentGizmosManager.js");
	const {ComponentGizmos} = await importer.import("../../../../../editor/src/componentGizmos/gizmos/ComponentGizmos.js");
	const componentGizmosManager = new ComponentGizmosManager();

	const MockComponentConstructor = /** @type {typeof import("../../../../../src/mod.js").Component} */ (class FakeComponent {});
	const stubGizmoManager = /** @type {import("../../../../../src/mod.js").GizmoManager} */ ({});

	/**
	 * @extends {ComponentGizmos<CameraComponent, []>}
	 */
	class ExtendedComponentGizmos extends ComponentGizmos {
		static componentType = MockComponentConstructor;
		/** @type {any[]} */
		static requiredGizmos = [];
	}

	return {
		componentGizmosManager,
		stubGizmoManager,
		ExtendedComponentGizmos,
		ComponentGizmos,
		CameraComponent,
		MockComponentConstructor,
		async waitForFinish() {
			await importer.finishCoverageMapWrites();
		},
	};
}

Deno.test({
	name: "init(), registers the default component gizmos",
	fn() {
		const manager = new ComponentGizmosManager();
		manager.init();

		const cameraComponentGizmos = manager.getComponentGizmosConstructor(CameraComponent);

		assertExists(cameraComponentGizmos);
	},
});

Deno.test({
	name: "Registering a ComponentGizmos class",
	async fn() {
		const {componentGizmosManager, waitForFinish, ExtendedComponentGizmos, MockComponentConstructor} = await basicSetup();

		componentGizmosManager.registerComponentGizmos(ExtendedComponentGizmos);
		const result = componentGizmosManager.getComponentGizmosConstructor(MockComponentConstructor);

		assertStrictEquals(result, ExtendedComponentGizmos);

		await waitForFinish();
	},
});

Deno.test({
	name: "registerComponentGizmos() throws if the ComponentGizmos class does not extend ComponentGizmos",
	async fn() {
		const {componentGizmosManager, waitForFinish} = await basicSetup();

		assertThrows(() => componentGizmosManager.registerComponentGizmos(/** @type {any} */ ({})));

		await waitForFinish();
	},
});

Deno.test({
	name: "registerComponentGizmos() throws if the ComponentGizmos class does not have `componentType` set",
	async fn() {
		const {componentGizmosManager, waitForFinish, ComponentGizmos} = await basicSetup();

		/**
		 * @extends {ComponentGizmos<any, []>}
		 */
		class ExtendedComponentGizmos extends ComponentGizmos {
		}

		assertThrows(() => componentGizmosManager.registerComponentGizmos(ExtendedComponentGizmos));

		await waitForFinish();
	},
});

Deno.test({
	name: "createComponentGizmosInstance()",
	async fn() {
		const {componentGizmosManager, waitForFinish, ExtendedComponentGizmos, MockComponentConstructor, stubGizmoManager} = await basicSetup();

		componentGizmosManager.registerComponentGizmos(ExtendedComponentGizmos);

		const component = new MockComponentConstructor();
		const gizmosInstance = componentGizmosManager.createComponentGizmosInstance(MockComponentConstructor, component, stubGizmoManager);

		assert(gizmosInstance instanceof ExtendedComponentGizmos, "Returned value is not an instance of ExtendedComponentGizmos");

		await waitForFinish();
	},
});

Deno.test({
	name: "createComponentGizmosInstance() returns null when the constructor isn't registered",
	async fn() {
		const manager = new ComponentGizmosManager();
		manager.init();

		const MockComponentConstructor = /** @type {typeof import("../../../../../src/mod.js").Component} */ (class FakeComponent {});
		const stubGizmoManager = /** @type {import("../../../../../src/mod.js").GizmoManager} */ ({});
		const component = new MockComponentConstructor();

		const cameraComponentGizmos = manager.createComponentGizmosInstance(MockComponentConstructor, component, stubGizmoManager);

		assertEquals(cameraComponentGizmos, null);
	},
});
