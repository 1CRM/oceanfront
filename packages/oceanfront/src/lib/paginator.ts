export interface Paginator {
  page: number
  startRecord: number
  perPage: number
}

export const calcOffset = (page: number, perPage: number): number => {
  return perPage * page - perPage
}

export const calcTotalPages = function (
  recordsNum: number,
  perPage: number,
): number {
  return Math.ceil(recordsNum / perPage)
}

export const calcStartRecord = (page: number, perPage: number): number => {
  return calcOffset(page, perPage) + 1
}

export const calcPageValue = (startRecord: number, perPage: number): number => {
  return Math.floor((startRecord - 1 + perPage) / perPage)
}
