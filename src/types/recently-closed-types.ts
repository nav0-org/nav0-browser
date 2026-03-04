export type ClosedTabRecord = {
  url: string;
  title: string;
  faviconUrl: string | null;
  closedAt: number;
};

export type ClosedWindowTabInfo = {
  url: string;
  title: string;
  faviconUrl: string | null;
};

export type ClosedWindowRecord = {
  id: string;
  tabs: ClosedWindowTabInfo[];
  tabCount: number;
  closedAt: number;
};
