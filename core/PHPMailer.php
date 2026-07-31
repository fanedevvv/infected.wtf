<?php
/**
 * PHPMailer - Minimal SMTP mailer for biolink
 * Stripped-down version: supports SSL/TLS SMTP only (no OAuth, no DKIM extras needed here).
 * Compatible with PHP 7.4+
 */
class PHPMailerException extends RuntimeException {}

class PHPMailer {
    // Connection
    public string $Host       = '';
    public int    $Port       = 465;
    public string $SMTPSecure = 'ssl'; // 'ssl' or 'tls'
    public bool   $SMTPAuth   = true;
    public string $Username   = '';
    public string $Password   = '';

    // Message
    public string $From       = '';
    public string $FromName   = '';
    public string $Subject    = '';
    public string $Body       = '';       // HTML
    public string $AltBody    = '';       // Plain text
    public string $CharSet    = 'UTF-8';
    public string $ContentType= 'text/html';
    public int    $SMTPDebug  = 0;
    public int    $Timeout    = 10;

    private array  $to        = [];
    private mixed $smtp      = null;

    public function addAddress(string $email, string $name = ''): void {
        $this->to[] = ['email' => $email, 'name' => $name];
    }

    public function isHTML(bool $yes = true): void {
        $this->ContentType = $yes ? 'text/html' : 'text/plain';
    }

    public function send(): bool {
        if (empty($this->to))          throw new PHPMailerException('No recipients');
        if (empty($this->From))        throw new PHPMailerException('From address not set');
        if (empty($this->Host))        throw new PHPMailerException('SMTP host not set');

        $scheme  = ($this->SMTPSecure === 'ssl') ? 'ssl://' : '';
        $context = stream_context_create([
            'ssl' => [
                'verify_peer'       => false,
                'verify_peer_name'  => false,
                'allow_self_signed' => true,
            ]
        ]);

        $errno = 0; $errstr = '';
        $conn = @stream_socket_client(
            $scheme . $this->Host . ':' . $this->Port,
            $errno, $errstr, $this->Timeout,
            STREAM_CLIENT_CONNECT,
            $context
        );
        if (!$conn) throw new PHPMailerException("SMTP connect failed: $errstr ($errno)");

        stream_set_timeout($conn, $this->Timeout);

        $this->_read($conn); // greeting

        // EHLO
        $this->_send($conn, "EHLO " . ($_SERVER['SERVER_NAME'] ?? 'localhost'));
        $this->_read($conn);

        // STARTTLS if TLS
        if ($this->SMTPSecure === 'tls') {
            $this->_send($conn, "STARTTLS");
            $resp = $this->_read($conn);
            if (strpos($resp, '220') !== 0) throw new PHPMailerException("STARTTLS failed: $resp");
            stream_socket_enable_crypto($conn, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            $this->_send($conn, "EHLO " . ($_SERVER['SERVER_NAME'] ?? 'localhost'));
            $this->_read($conn);
        }

        // AUTH
        if ($this->SMTPAuth) {
            $this->_send($conn, "AUTH LOGIN");
            $this->_read($conn);
            $this->_send($conn, base64_encode($this->Username));
            $this->_read($conn);
            $this->_send($conn, base64_encode($this->Password));
            $resp = $this->_read($conn);
            if (strpos($resp, '235') !== 0) throw new PHPMailerException("SMTP auth failed: $resp");
        }

        // MAIL FROM
        $this->_send($conn, "MAIL FROM:<{$this->From}>");
        $this->_read($conn);

        // RCPT TO
        foreach ($this->to as $recipient) {
            $this->_send($conn, "RCPT TO:<{$recipient['email']}>");
            $this->_read($conn);
        }

        // DATA
        $this->_send($conn, "DATA");
        $this->_read($conn);

        $message = $this->_buildMessage();
        $this->_send($conn, $message . "\r\n.");
        $resp = $this->_read($conn);

        // QUIT
        $this->_send($conn, "QUIT");
        fclose($conn);

        if (strpos($resp, '250') !== 0) throw new PHPMailerException("Message rejected: $resp");
        return true;
    }

    private function _buildMessage(): string {
        $boundary = '----=_Part_' . md5(uniqid('', true));
        $fromName = $this->FromName ? $this->_encodeHeader($this->FromName) . " <{$this->From}>" : $this->From;

        $toLine = implode(', ', array_map(function($r) {
            return $r['name'] ? $this->_encodeHeader($r['name']) . " <{$r['email']}>" : $r['email'];
        }, $this->to));

        $headers  = "Date: " . date('r') . "\r\n";
        $headers .= "From: {$fromName}\r\n";
        $headers .= "To: {$toLine}\r\n";
        $headers .= "Subject: " . $this->_encodeHeader($this->Subject) . "\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "X-Mailer: PHPMailer-Minimal\r\n";

        $htmlBody  = $this->Body;
        $plainBody = $this->AltBody ?: strip_tags($this->Body);

        if ($this->AltBody) {
            $headers .= "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n";
            $body  = "--{$boundary}\r\n";
            $body .= "Content-Type: text/plain; charset={$this->CharSet}\r\n";
            $body .= "Content-Transfer-Encoding: quoted-printable\r\n\r\n";
            $body .= quoted_printable_encode($plainBody) . "\r\n";
            $body .= "--{$boundary}\r\n";
            $body .= "Content-Type: text/html; charset={$this->CharSet}\r\n";
            $body .= "Content-Transfer-Encoding: quoted-printable\r\n\r\n";
            $body .= quoted_printable_encode($htmlBody) . "\r\n";
            $body .= "--{$boundary}--";
        } else {
            $headers .= "Content-Type: text/html; charset={$this->CharSet}\r\n";
            $headers .= "Content-Transfer-Encoding: quoted-printable\r\n";
            $body = quoted_printable_encode($htmlBody);
        }

        return $headers . "\r\n" . $body;
    }

    private function _encodeHeader(string $str): string {
        if (preg_match('/[^\x20-\x7E]/', $str)) {
            return '=?UTF-8?B?' . base64_encode($str) . '?=';
        }
        return $str;
    }

    private function _send($conn, string $data): void {
        fwrite($conn, $data . "\r\n");
        if ($this->SMTPDebug) error_log("SMTP >> $data");
    }

    private function _read($conn): string {
        $resp = '';
        while ($line = fgets($conn, 512)) {
            $resp .= $line;
            if ($this->SMTPDebug) error_log("SMTP << $line");
            if (strlen($line) >= 4 && $line[3] === ' ') break; // last line of response
        }
        return $resp;
    }
}
