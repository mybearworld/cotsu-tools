export const isSceneChange = (records: MutationRecord[]) =>
  records.some(
    (record) =>
      record.target instanceof HTMLElement && record.target.id === "app",
  );
