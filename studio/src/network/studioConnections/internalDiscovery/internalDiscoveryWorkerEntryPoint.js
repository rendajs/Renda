/**
 * @fileoverview This is the entry point for the internalDiscovery SharedWorker.
 */

import {initializeWorker} from "./internalDiscoveryWorkerMain.js";

initializeWorker(globalThis);
