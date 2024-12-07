export function d1DateStringToLocaleString(utcString: string): string {
  const date = new Date(utcString.replace(" ", "T") + "Z");
  return date.toLocaleString();
}
