import "@johnmorrisdotca/tsunagi/element/define";

export function Level({ grid = "6", level = 12 }: { grid?: string; level?: number }) {
  return <tsunagi-board grid={grid} level={String(level)} />;
}
