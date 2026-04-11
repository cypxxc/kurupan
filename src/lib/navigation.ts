export function sanitizeInternalNextPath(nextPath: string | null | undefined) {
  if (!nextPath) {
    return "/dashboard";
  }

  const trimmedPath = nextPath.trim();

  if (
    trimmedPath.length === 0 ||
    !trimmedPath.startsWith("/") ||
    trimmedPath.startsWith("//") ||
    trimmedPath.includes("\\")
  ) {
    return "/dashboard";
  }

  return trimmedPath;
}
