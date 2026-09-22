export type BoxItem = {
  name: string;
  value: string;
  probabilityPpm: string;
};

export type Metrics = {
  totalPpm: number;
  differencePpm: number;
  expectedValueMnt: number;
  expectedPlatformProfitMnt: number;
  rtpBps: number;
  rtpPercent?: number;
  houseEdgeBps: number;
  houseEdgePercent?: number;
  userProfitProbabilityPpm: number;
  userProfitProbabilityPercent?: number;
};

export type SavedBox = {
  _id: string;
  name: string;
  status?: "DRAFT" | "LIVE";
  priceMnt: number;
  items: { name: string; valueMnt: number; probabilityPpm: number }[];
  calculations?: Metrics;
};

export type BoxVersion = {
  versionNumber: number;
  status?: "DRAFT" | "LIVE";
  priceMnt: number;
  items: { name: string; valueMnt: number; probabilityPpm: number }[];
  calculations?: Metrics;
  createdAt?: string;
};

export type BoxPayload = {
  name: string;
  priceMnt: number;
  items: { name: string; valueMnt: number; probabilityPpm: number }[];
};

export type Simulation = {
  openingCount: number;
  totalRevenueMnt: number;
  totalPayoutMnt: number;
  totalProfitLossMnt: number;
  averageProfitLossMnt: number;
  minimumProfitLossMnt: number;
  maximumProfitLossMnt: number;
  profitLosses: number[];
};
