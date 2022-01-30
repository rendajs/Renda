#!/usr/bin/env -S deno run --allow-net --unstable --importmap=importmap.json

import {init} from "./mainInstance.js";
init();
