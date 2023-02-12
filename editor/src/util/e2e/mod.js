/**
 * @fileoverview A collection of utility functions that are only used by e2e tests.
 * Functions are assigned to the global `e2e` namespace so that tests can access them without the need to dynamically import anything.
 * This also makes it easier to debug tests from the browser inspector.
 * These functions are not available in production.
 */

export * from "./treeView.js";
