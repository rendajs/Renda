/**
 * @fileoverview This is the entry point for the editorDiscovery SharedWorker.
 */

import {initializeWorker} from "./internalDiscoveryWorkerMain.js";

initializeWorker(globalThis);
