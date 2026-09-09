# Security

Please report vulnerabilities privately. Do not open a public issue.

Use [GitHub private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) on this repository if it is enabled, or email the maintainers through the GitHub profile that owns the package.

This library renders SVG from generated, allowlisted geometry. Reports that matter most:

- Script execution, external resource loads, or unexpected network access from icon data.
- Path traversal or loader imports outside `dist/generated/icons/`.
- Supply-chain issues in the publish workflow.

The generated catalog is rebuilt from `@fluentui/svg-icons`. Issues in Microsoft's
artwork should also be reported upstream when they are not specific to this wrapper.
