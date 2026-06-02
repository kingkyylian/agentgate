import path from "node:path";
import picomatch from "picomatch";

export const toPosix = (value: string): string => value.replaceAll(path.sep, "/");

export const normalizeWorkspacePath = (workspaceRoot: string, cwd: string, targetPath: string): {
  absolutePath: string;
  relativePath: string;
  insideWorkspace: boolean;
} => {
  const base = path.isAbsolute(targetPath) ? targetPath : path.resolve(cwd, targetPath);
  const absoluteWorkspace = path.resolve(workspaceRoot);
  const absolutePath = path.resolve(base);
  const relativePath = toPosix(path.relative(absoluteWorkspace, absolutePath));
  const insideWorkspace = relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));

  return {
    absolutePath,
    relativePath: relativePath === "" ? "." : relativePath,
    insideWorkspace
  };
};

export const matchesAny = (value: string, patterns: string[]): boolean => {
  return patterns.some((pattern) => picomatch.isMatch(value, pattern, { dot: true }));
};
