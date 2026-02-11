export type BrowsingHistoryRecord = {
  id: string,
  createdDate: Date,
  url: string,
  title: string,
  topLevelDomain: string,
  faviconUrl?: string
}