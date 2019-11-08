import check from 'string-similarity';

export default function compareCode(a: string, b: string) {
  return check.compareTwoStrings(a, b);
}
