export type MainSkeletonItem = {
  type: "main-skeleton";
  skeleton: any;
};

export type PartialItem = {
  type: "partial";
  index: number;
  value: any;
  isError: boolean;
};

export type SubSkeletonItem = {
  type: "sub-skeleton";
  index: number;
  skeleton: any;
};

export type Item = MainSkeletonItem | PartialItem | SubSkeletonItem;
