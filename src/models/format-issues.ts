import type { z } from 'zod';

/** One "path: message" line per validation issue; `root` names an issue on the whole value. */
export function formatIssues(error: z.ZodError, root: string): string[] {
  return error.issues.map((issue) => `${issue.path.join('.') || root}: ${issue.message}`);
}
