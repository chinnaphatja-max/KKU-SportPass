/**
 * Thai PromptPay EMVCo QR Code Payload Generator
 * 
 * Complies with Bank of Thailand (BOT) Standard for QR Code Payment (EMVCo Tag-Length-Value format)
 * Supports:
 * - Mobile Phone numbers (08x, 09x, 06x) -> Formatted as 0066...
 * - National ID / Tax ID (13 digits) -> E.g. KKU Tax ID or Student/Staff ID
 * - e-Wallet ID (15 digits)
 * - Fixed amount & dynamic CRC-16 CCITT checksum
 */

/**
 * Calculates CRC-16 CCITT (Polynomial: 0x1021, Initial: 0xFFFF) for EMVCo standard
 * @param {string} data - Payload string without checksum
 * @returns {string} 4-character uppercase hexadecimal checksum
 */
function crc16(data) {
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
        crc ^= (data.charCodeAt(i) << 8);
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
            } else {
                crc = (crc << 1) & 0xFFFF;
            }
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Formats a Tag-Length-Value (TLV) segment
 * @param {string} id - 2-digit tag ID
 * @param {string} value - tag value
 * @returns {string}
 */
function formatTlv(id, value) {
    const valStr = String(value || '');
    const lenStr = String(valStr.length).padStart(2, '0');
    return `${id}${lenStr}${valStr}`;
}

/**
 * Sanitizes and normalizes Thai PromptPay identifier
 * @param {string} target - Mobile number, Tax ID, or e-Wallet ID
 * @returns {{ type: 'mobile' | 'tax' | 'wallet', sanitized: string, subTag: string }}
 */
function parsePromptPayTarget(target) {
    if (!target) {
        throw new Error('PromptPay target ID is required');
    }

    const clean = String(target).replace(/[^0-9]/g, '');

    // Thai Mobile: 10 digits starting with 0
    if (clean.length === 10 && clean.startsWith('0')) {
        return {
            type: 'mobile',
            sanitized: `0066${clean.substring(1)}`,
            subTag: '01'
        };
    }

    // National ID or Tax ID: 13 digits
    if (clean.length === 13) {
        return {
            type: 'tax',
            sanitized: clean,
            subTag: '02'
        };
    }

    // e-Wallet ID: 15 digits
    if (clean.length === 15) {
        return {
            type: 'wallet',
            sanitized: clean,
            subTag: '03'
        };
    }

    throw new Error('Invalid PromptPay target: Must be 10-digit mobile, 13-digit Tax ID, or 15-digit e-Wallet ID');
}

/**
 * Generates an EMVCo-compliant Thai PromptPay QR Payload string
 * @param {string} target - PromptPay recipient ID (phone / tax ID / wallet ID)
 * @param {number|string|null} amount - Transaction amount in THB (optional)
 * @param {string} target - PromptPay recipient (Mobile, Tax ID, Wallet)
 * @param {number|null} [amount=null] - Transaction amount in THB
 * @param {Object} [options={}] - Additional data
 * @param {string} [options.referenceNo] - Reference ID / Invoice No (Tag 62 Subtag 05)
 * @returns {string} Standard EMVCo QR code string ready for scanning
 */
function generatePromptPayPayload(target, amount = null, options = {}) {
    const { sanitized, subTag } = parsePromptPayTarget(target);

    // Tag 00: Payload Format Indicator = '01'
    let payload = formatTlv('00', '01');

    // Tag 01: Point of Initiation Method: 12 (Dynamic with amount) or 11 (Static)
    const hasAmount = amount !== null && amount !== undefined && Number(amount) > 0;
    payload += formatTlv('01', hasAmount ? '12' : '11');

    // Tag 29: Merchant Account Information (PromptPay AID: A000000677010111)
    const promptPayAid = formatTlv('00', 'A000000677010111');
    const recipientInfo = formatTlv(subTag, sanitized);
    payload += formatTlv('29', promptPayAid + recipientInfo);

    // Tag 53: Transaction Currency (764 = THB / Thai Baht)
    payload += formatTlv('53', '764');

    // Tag 54: Transaction Amount (formatted to 2 decimal places if present)
    if (hasAmount) {
        const numAmount = Number(amount);
        payload += formatTlv('54', numAmount.toFixed(2));
    }

    // Tag 58: Country Code (TH = Thailand)
    payload += formatTlv('58', 'TH');

    // Tag 62: Additional Data Field Template (Reference Number / Bill Number)
    const ref = options?.referenceNo;
    if (ref) {
        const refSubTlv = formatTlv('05', String(ref).substring(0, 25)); // Ref label up to 25 chars
        payload += formatTlv('62', refSubTlv);
    }

    // Tag 63: Checksum (CRC-16 CCITT)
    const partial = payload + '6304';
    const checksum = crc16(partial);

    return partial + checksum;
}

/**
 * Verifies if an EMVCo string has a valid CRC-16 checksum
 * @param {string} payload
 * @returns {boolean}
 */
function verifyPromptPayCrc(payload) {
    if (!payload || payload.length < 8) return false;
    const data = payload.slice(0, -4);
    const expectedCrc = payload.slice(-4).toUpperCase();
    return crc16(data) === expectedCrc;
}

module.exports = {
    crc16,
    formatTlv,
    parsePromptPayTarget,
    generatePromptPayPayload,
    verifyPromptPayCrc
};
