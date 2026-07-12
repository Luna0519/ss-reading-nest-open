const fileNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base"
});

export function sortMangaFiles(files: Iterable<File>): File[] {
  return Array.from(files)
    .map((file, originalIndex) => ({ file, originalIndex }))
    .sort(
      (left, right) =>
        fileNameCollator.compare(left.file.name, right.file.name) ||
        left.originalIndex - right.originalIndex
    )
    .map(({ file }) => file);
}
