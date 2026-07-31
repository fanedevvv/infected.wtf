<?php
/**
 * Minimal TOTP (Google Authenticator compatible) implementation
 * RFC 6238 — no dependencies required
 */
class TOTP {
    private string $secret;
    private int    $digits  = 6;
    private int    $period  = 30;
    private string $algo    = 'sha1';

    public function __construct(string $secret) {
        $this->secret = $secret;
    }

    public static function generateSecret(): string {
        $chars  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $secret = '';
        $bytes  = random_bytes(32);
        for ($i = 0; $i < 32; $i++) {
            $secret .= $chars[ord($bytes[$i]) & 31];
        }
        return $secret;
    }

    public function getCode(int $timestamp = null): string {
        $timestamp = $timestamp ?? time();
        $counter   = (int)floor($timestamp / $this->period);
        return $this->hotp($counter);
    }

    public function verify(string $code, int $discrepancy = 1): bool {
        $timestamp = time();
        for ($i = -$discrepancy; $i <= $discrepancy; $i++) {
            if (hash_equals($this->getCode($timestamp + ($i * $this->period)), $code)) {
                return true;
            }
        }
        return false;
    }

    public function getQRUri(string $label, string $issuer): string {
        $label   = rawurlencode($issuer . ':' . $label);
        $issuer  = rawurlencode($issuer);
        $secret  = $this->secret;
        return "otpauth://totp/{$label}?secret={$secret}&issuer={$issuer}&algorithm=SHA1&digits={$this->digits}&period={$this->period}";
    }

    private function hotp(int $counter): string {
        $key  = self::base32Decode($this->secret);
        $msg  = pack('J', $counter);
        $hash = hash_hmac($this->algo, $msg, $key, true);
        $off  = ord($hash[-1]) & 0x0f;
        $code = (
            ((ord($hash[$off])   & 0x7f) << 24) |
            ((ord($hash[$off+1]) & 0xff) << 16) |
            ((ord($hash[$off+2]) & 0xff) <<  8) |
             (ord($hash[$off+3]) & 0xff)
        ) % (10 ** $this->digits);
        return str_pad((string)$code, $this->digits, '0', STR_PAD_LEFT);
    }

    private static function base32Decode(string $s): string {
        $map    = array_flip(str_split('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'));
        $s      = strtoupper(rtrim($s, '='));
        $buf    = 0;
        $bufLen = 0;
        $result = '';
        foreach (str_split($s) as $c) {
            if (!isset($map[$c])) continue;
            $buf    = ($buf << 5) | $map[$c];
            $bufLen += 5;
            if ($bufLen >= 8) {
                $bufLen -= 8;
                $result .= chr(($buf >> $bufLen) & 0xff);
            }
        }
        return $result;
    }
}