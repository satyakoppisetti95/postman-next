export type EnvVariable = { key: string; value: string };

export function substituteVariables(
  input: string | undefined,
  vars: EnvVariable[]
): string {
  if (!input) return "";
  let output = input;
  for (const v of vars) {
    const pattern = new RegExp(`\\{\\{${escapeRegExp(v.key)}\\}\\}`, "g");
    output = output.replace(pattern, v.value);
  }
  return output;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
