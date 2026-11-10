const GSM7_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM7_EXTENDED = '^{}\\[~]|€';

export type SmsEncoding = 'gsm-7' | 'ucs-2';

export type SmsSegmentInfo = {
  encoding: SmsEncoding;
  length: number;
  segments: number;
  charsPerSegment: number;
};

function isGsm7Char(char: string): boolean {
  return GSM7_BASIC.includes(char) || GSM7_EXTENDED.includes(char);
}

export function smsEncoding(text: string): SmsEncoding {
  for (const char of text) {
    if (!isGsm7Char(char)) return 'ucs-2';
  }
  return 'gsm-7';
}

function gsm7Length(text: string): number {
  let len = 0;
  for (const char of text) {
    len += GSM7_EXTENDED.includes(char) ? 2 : 1;
  }
  return len;
}

/** GSM-7: 160 single / 153 multipart; UCS-2: 70 / 67 */
export function smsSegments(text: string): SmsSegmentInfo {
  const encoding = smsEncoding(text);
  if (encoding === 'ucs-2') {
    const length = [...text].length;
    const single = 70;
    const multi = 67;
    const segments = length <= single ? 1 : Math.ceil(length / multi);
    return {
      encoding,
      length,
      segments,
      charsPerSegment: segments === 1 ? single : multi,
    };
  }

  const length = gsm7Length(text);
  const single = 160;
  const multi = 153;
  const segments = length <= single ? 1 : Math.ceil(length / multi);
  return {
    encoding,
    length,
    segments,
    charsPerSegment: segments === 1 ? single : multi,
  };
}
