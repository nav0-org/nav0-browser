export type BrowsingHistoryRecord = {
  id: string;
  createdDate: Date;
  url: string;
  title: string;
  topLevelDomain: string;
  faviconUrl?: string;
  totalDuration: number;
  activeDuration: number;
  outTimestamp?: Date;
};

/** One site's visits and active time over a range of the history. */
export type BrowsingHistorySiteTotal = {
  domain: string;
  visits: number;
  activeDuration: number;
  faviconUrl: string | null;
};

/** One category's visits and active time over a range of the history. */
export type BrowsingHistoryCategoryTotal = {
  category: string;
  visits: number;
  activeDuration: number;
};

/**
 * The History page's Top sites and By category panels for a range: the
 * leading sites and categories, ranked by active time, or by visits when
 * nothing in the range has any.
 */
export type BrowsingHistorySummary = {
  byActiveTime: boolean;
  sites: BrowsingHistorySiteTotal[];
  categories: BrowsingHistoryCategoryTotal[];
};
