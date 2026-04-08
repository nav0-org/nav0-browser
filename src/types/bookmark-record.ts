export type BookmarkRecord = {
  id: string,
  createdDate: Date,
  url: string,
  title: string,
  faviconUrl?: string,
  type: 'reference' | 'queue'
}

export type BookmarkWithStats = BookmarkRecord & {
  visits: number,
  lastVisited: string | null
}