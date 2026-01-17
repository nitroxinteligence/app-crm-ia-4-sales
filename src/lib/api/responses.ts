type ResponseInitWithStatus = ResponseInit & { status: number }

const textResponse = (message: string, init: ResponseInitWithStatus) =>
  new Response(message, init)

export const badRequest = (message: string) => textResponse(message, { status: 400 })

export const unauthorized = (message: string) =>
  textResponse(message, { status: 401 })

export const forbidden = (message: string) => textResponse(message, { status: 403 })

export const notFound = (message: string) => textResponse(message, { status: 404 })

export const serverError = (message: string) =>
  textResponse(message, { status: 500 })

export const badGateway = (message: string) =>
  textResponse(message, { status: 502 })

export const serviceUnavailable = (message: string) =>
  textResponse(message, { status: 503 })

export const preconditionFailed = (message: string) =>
  textResponse(message, { status: 412 })

export const unprocessableEntity = (message: string) =>
  textResponse(message, { status: 422 })

export const unsupportedMediaType = (message: string) =>
  textResponse(message, { status: 415 })

export const conflict = (message: string) =>
  textResponse(message, { status: 409 })

export const gone = (message: string) => textResponse(message, { status: 410 })

export const httpError = (message: string, status: number) =>
  textResponse(message, { status })

export const paymentRequired = (message: string) =>
  textResponse(message, { status: 402 })
