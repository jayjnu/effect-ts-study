import { Context } from "effect"

export interface RequestContextShape {
  readonly requestId: string
  readonly actorId: string
}

export class RequestContext extends Context.Tag("RequestContext")<
  RequestContext,
  RequestContextShape
>() {}
