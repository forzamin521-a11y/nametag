export type FontRange = {
  readonly maximumPt: number
  readonly minimumPt: number
}

export type TextFitResult = {
  readonly nameSizePt: number
  readonly organizationSizePt?: number
  readonly fits: boolean
}

export const nameFontRange: FontRange = { maximumPt: 48, minimumPt: 24 }
export const organizationFontRange: FontRange = { maximumPt: 22, minimumPt: 14 }

// A triangular tent name face is one panel of A4 landscape (297 x 75 mm): very wide, short.
export const tentNameFontRange: FontRange = { maximumPt: 48, minimumPt: 24 }
export const tentOrganizationFontRange: FontRange = { maximumPt: 22, minimumPt: 14 }

type FitRequest = {
  readonly name: FontRange
  readonly organization?: FontRange
  readonly fits: (sizes: { readonly nameSizePt: number; readonly organizationSizePt?: number }) => boolean
}

function descending(range: FontRange): readonly number[] {
  return Array.from(
    { length: range.maximumPt - range.minimumPt + 1 },
    (_, index) => range.maximumPt - index,
  )
}

/** Finds the largest readable whole-point type pair accepted by the layout measurement. */
export function fitText({ name, organization, fits }: FitRequest): TextFitResult {
  const nameSizes = descending(name)
  const organizationSizes = organization === undefined ? [undefined] : descending(organization)

  for (const nameSizePt of nameSizes) {
    for (const organizationSizePt of organizationSizes) {
      const sizes = organizationSizePt === undefined
        ? { nameSizePt }
        : { nameSizePt, organizationSizePt }

      if (fits(sizes)) {
        return { ...sizes, fits: true }
      }
    }
  }

  return organization === undefined
    ? { nameSizePt: name.minimumPt, fits: false }
    : {
        nameSizePt: name.minimumPt,
        organizationSizePt: organization.minimumPt,
        fits: false,
      }
}
