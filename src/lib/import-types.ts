export type ImportMode = 'name' | 'organization-name'

export type NametagRecord = {
  readonly name: string
  readonly organization?: string
  readonly sheet: string
  readonly row: number
}

/** A roster row enriched for the editor: a stable id and whether it prints. */
export type RosterEntry = NametagRecord & {
  readonly id: string
  readonly selected: boolean
}

export type WorkbookColumn = {
  readonly index: number
  readonly label: string
  readonly header: string
}

export type WorkbookSheet = {
  readonly index: number
  readonly name: string
  readonly headerRows: readonly number[]
  readonly defaultHeaderRow: number
  readonly columns: readonly WorkbookColumn[]
}

export type ColumnMapping = {
  readonly nameColumn: number
  readonly organizationColumn?: number
}

export type ImportIssueCode =
  | 'cancelled'
  | 'file-too-large'
  | 'invalid-workbook'
  | 'no-worksheet'
  | 'sheet-too-large'
  | 'invalid-sheet'
  | 'invalid-header-row'
  | 'missing-column'
  | 'duplicate-columns'
  | 'no-data'
  | 'too-many-records'
  | 'missing-value'
  | 'formula-cell'
  | 'error-cell'

export type ImportIssue = {
  readonly code: ImportIssueCode
  readonly message: string
  readonly sheet?: string
  readonly row?: number
}

export type WorkbookInspection = {
  readonly sheets: readonly WorkbookSheet[]
  readonly defaultSheetIndex: number
}

export type WorkbookParseRequest = {
  readonly mode: ImportMode
  readonly sheetIndex?: number
  readonly headerRow?: number
  readonly mapping?: ColumnMapping
}

export type WorkbookParseSuccess = {
  readonly kind: 'success'
  readonly records: readonly NametagRecord[]
  readonly inspection: WorkbookInspection
  readonly sheet: string
  readonly headerRow: number
  readonly mapping: ColumnMapping
}

export type WorkbookParseFailure = {
  readonly kind: 'failure'
  readonly issues: readonly ImportIssue[]
  readonly totalIssues: number
}

export type WorkbookParseResult = WorkbookParseSuccess | WorkbookParseFailure
