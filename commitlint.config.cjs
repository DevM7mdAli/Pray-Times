module.exports = {
  extends: ["@commitlint/config-conventional"],
  ignores: [(message) => message.trim() === "Create CNAME"],
  rules: {
    "body-max-line-length": [0, "always", 100],
    "type-enum": [
      2,
      "always",
      [
        "build",
        "chore",
        "ci",
        "docs",
        "feat",
        "fix",
        "perf",
        "refactor",
        "revert",
        "style",
        "test",
      ],
    ],
  },
};
