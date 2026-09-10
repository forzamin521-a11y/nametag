import { parseWorkbook } from '../lib/workbook'
import type { WorkbookParseRequest, WorkbookParseResult } from '../lib/import-types'

type WorkerRequest = { readonly kind: 'parse'; readonly id: string; readonly bytes: ArrayBuffer; readonly request: WorkbookParseRequest }
type WorkerResponse = { readonly kind: 'result'; readonly id: string; readonly result: WorkbookParseResult }

addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const message = event.data
  if (message.kind !== 'parse') return
  const response: WorkerResponse = { kind: 'result', id: message.id, result: parseWorkbook(message.bytes, message.request) }
  postMessage(response)
})
