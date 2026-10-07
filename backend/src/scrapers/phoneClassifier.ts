export interface ClassifiedPhones {
  primary: string | null;
  secondary: string | null;
}

export function isMobileNumber(raw: string): boolean {
  if (!raw) return false;
  const digits = raw.replace(/\D/g, '');

  if (digits.startsWith('9715') || digits.startsWith('050') || digits.startsWith('052') || digits.startsWith('054') || digits.startsWith('055') || digits.startsWith('056') || digits.startsWith('058')) {
    return true;
  }
  if (digits.length === 9 && (digits.startsWith('50') || digits.startsWith('52') || digits.startsWith('54') || digits.startsWith('55') || digits.startsWith('56') || digits.startsWith('58'))) {
    return true;
  }

  if (digits.startsWith('9665') || (digits.startsWith('05') && digits.length === 10)) {
    return true;
  }

  if (digits.startsWith('447') || (digits.startsWith('07') && digits.length === 11)) {
    return true;
  }

  if ((digits.startsWith('91') && digits.length === 12 && /^[6-9]/.test(digits.slice(2))) || (digits.length === 10 && /^[6-9]/.test(digits))) {
    return true;
  }

  if (digits.length === 10 || digits.length === 11) {
    const mainPart = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    const tollFree = ['800', '888', '877', '866', '855', '844', '833'];
    if (tollFree.some(tf => mainPart.startsWith(tf))) {
      return false;
    }
  }

  return false;
}

export function classifyPhones(candidates: (string | null | undefined)[]): ClassifiedPhones {
  const uniqueNumbers: string[] = [];
  const seenDigits = new Set<string>();

  for (const item of candidates) {
    if (!item || typeof item !== 'string') continue;
    const trimmed = item.trim();
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length < 7 || seenDigits.has(digits)) continue;
    seenDigits.add(digits);
    uniqueNumbers.push(trimmed);
  }

  if (uniqueNumbers.length === 0) {
    return { primary: null, secondary: null };
  }

  if (uniqueNumbers.length === 1) {
    return { primary: uniqueNumbers[0], secondary: null };
  }

  let mobileNum: string | null = null;
  let landlineNum: string | null = null;

  for (const num of uniqueNumbers) {
    if (isMobileNumber(num)) {
      if (!mobileNum) mobileNum = num;
    } else {
      if (!landlineNum) landlineNum = num;
    }
    if (mobileNum && landlineNum) break;
  }

  if (mobileNum && landlineNum) {
    return { primary: mobileNum, secondary: landlineNum };
  }

  return {
    primary: uniqueNumbers[0],
    secondary: uniqueNumbers[1]
  };
}
