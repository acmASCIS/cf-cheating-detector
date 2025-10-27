import check from 'string-similarity';

export default function compareCode(a: string, b: string) {
  if(a===''&&b===''){
    return 0;
  }
  return check.compareTwoStrings(a, b);
}
