export function textifyTeamName(name: string): string {
  let s = name.toLowerCase();
  s = s.replaceAll("+", "＋");
  s = s.replaceAll("-", "–");
  s = s.replaceAll("'", "´");
  s = s.replaceAll("$", "s");
  s = s.replaceAll(" & ", " and ");
  s = s.replaceAll("&", " and ");
  s = s.replaceAll(" = ", " is ");
  s = s.replaceAll("=", " is ");

  const chars = s.split("");
  const filtered = chars.filter((c) => /[\w＋–´ ]/.test(c));
  return filtered.join("");
}
