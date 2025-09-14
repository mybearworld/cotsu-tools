export const isSceneChange = (records: MutationRecord[]) =>
  records.some(
    (record) =>
      (record.target instanceof HTMLElement &&
        record.target.id === "gatsby-focus-wrapper") ||
      (record.addedNodes.length > 0 &&
        record.addedNodes[0] instanceof HTMLElement &&
        record.addedNodes[0].id === "gatsby-focus-wrapper"),
  );
