import type {ProtocolManagerRequestHandler, RequestMetaData} from "../ProtocolManager";
import type {autoRegisterRequestHandlers} from "./autoRegisterRequestHandlers";

type HandlerTypes = typeof autoRegisterRequestHandlers extends (infer T)[] ? T : never;

export type HandlerCommands = HandlerTypes extends ProtocolManagerRequestHandler<infer Command, any, any, any, any> ? Command : never;

export type getRequestHandlerType<T> = Extract<HandlerTypes, {command: T}>;

type hasPrepareHelper<T> =
	getRequestHandlerType<T> extends ProtocolManagerRequestHandler<string, any, infer PrepareSignature, any, any> ?
		PrepareSignature extends undefined ?
			true :
			never :
		never;

type hasPrepare<T extends HandlerCommands> = hasPrepareHelper<T> extends never ? true : false;

type hasHandleResponseHelper<T> =
	getRequestHandlerType<T> extends ProtocolManagerRequestHandler<string, any, any, any, infer ResponseSignature> ?
		ResponseSignature extends undefined ?
			true :
			never :
		never;

type hasHandleResponse<T extends HandlerCommands> = hasHandleResponseHelper<T> extends never ? true : false;


type getRequestHandlerArgsFull<T extends HandlerCommands> =
	getRequestHandlerType<T> extends ProtocolManagerRequestHandler<string, any, infer PrepareSignature, infer RequestSignature, any> ?
		hasPrepare<T> extends true ?
			PrepareSignature extends (...args: infer Args) => any ? Args : never :
			RequestSignature extends (...args: infer Args) => any ? Args : never :
		never;

export type getRequestHandlerArgs<T extends HandlerCommands> =
	getRequestHandlerArgsFull<T> extends infer FullArgs ?
		NonNullable<getRequestHandlerType<T>["needsRequestMetaData"]> extends true ?
			FullArgs extends [meta: RequestMetaData, ...rest: infer Args] ?
				[...args: Args] :
				never :
			[...args: FullArgs] :
		never;

export type getRequestHandlerReturnType<T extends HandlerCommands> =
	getRequestHandlerType<T> extends ProtocolManagerRequestHandler<string, any, any, infer RequestSignature, infer ResponseSignature> ?
		hasHandleResponse<T> extends true ?
			ReturnType<ResponseSignature> :
			ReturnType<RequestSignature> :
		never;
