navigator.gpu = {}
navigator.gpu.requestAdapter = function(){}

const GPUMapMode = {};
GPUMapMode.READ = 0;
GPUMapMode.WRITE = 0;

const GPUTextureUsage = {};
GPUTextureUsage.COPY_SRC = 0;
GPUTextureUsage.COPY_DST = 0;
GPUTextureUsage.SAMPLED = 0;
GPUTextureUsage.STORAGE = 0;
GPUTextureUsage.RENDER_ATTACHMENT = 0;

const GPUBufferUsage = {};
GPUBufferUsage.MAP_READ = 0;
GPUBufferUsage.MAP_WRITE = 0;
GPUBufferUsage.COPY_SRC = 0;
GPUBufferUsage.COPY_DST = 0;
GPUBufferUsage.INDEX = 0;
GPUBufferUsage.VERTEX = 0;
GPUBufferUsage.UNIFORM = 0;
GPUBufferUsage.STORAGE = 0;
GPUBufferUsage.INDIRECT = 0;
GPUBufferUsage.QUERY_RESOLVE = 0;

const GPUShaderStage = {};
GPUShaderStage.VERTEX = 0;
GPUShaderStage.FRAGMENT = 0;
GPUShaderStage.COMPUTE = 0;
