import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Avatar, IconChevronLeft, IconQrPlus } from '@aegis/ui';
import { avatarFor, parseOtpAuth } from '@aegis/core';
import { useApp } from '../store';

type BarcodeDetectorLike = {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
};

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => BarcodeDetectorLike;
  }
}

/**
 * Adição de token 2FA: leitor de QR Code via câmera (BarcodeDetector,
 * quando o dispositivo suporta) com entrada manual como alternativa.
 * Também lista os tokens existentes para remoção.
 */
export function AddToken() {
  const { vault, closeAddToken, addToken, deleteToken } = useApp();
  const [issuer, setIssuer] = useState('');
  const [account, setAccount] = useState('');
  const [secretInput, setSecretInput] = useState('');
  const [error, setError] = useState('');
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'unavailable'>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanState('idle');
  };

  useEffect(() => stopCamera, []);

  const startScan = async () => {
    if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      setScanState('unavailable');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setScanState('scanning');
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const tick = async () => {
        if (!streamRef.current) return;
        try {
          const codes = await detector.detect(video);
          const parsed = codes[0] && parseOtpAuth(codes[0].rawValue);
          if (parsed) {
            setIssuer(parsed.issuer);
            setAccount(parsed.account);
            setSecretInput(parsed.secret);
            stopCamera();
            return;
          }
        } catch {
          // frame não decodificável — continua tentando
        }
        setTimeout(tick, 350);
      };
      tick();
    } catch {
      stopCamera();
      setScanState('unavailable');
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseOtpAuth(secretInput);
    if (!parsed) return setError('Segredo inválido (base32 ou URI otpauth://)');
    const finalIssuer = issuer.trim() || parsed.issuer;
    if (!finalIssuer) return setError('Informe o emissor (ex.: Google)');
    addToken({
      issuer: finalIssuer,
      account: account.trim() || parsed.account,
      secret: parsed.secret,
    });
    stopCamera();
    closeAddToken();
  };

  return (
    <div className="screen screen--scroll screen--slide">
      <div className="detail-nav">
        <button
          type="button"
          className="icon-btn"
          onClick={() => { stopCamera(); closeAddToken(); }}
          aria-label="Voltar"
        >
          <IconChevronLeft size={19} />
        </button>
        <div className="screen-title" style={{ fontSize: 19 }}>Adicionar 2FA</div>
        <div style={{ width: 40 }} />
      </div>

      <div className="detail-fields" style={{ paddingTop: 18 }}>
        {scanState === 'scanning' ? (
          <div className="qr-video-wrap">
            <video ref={videoRef} className="qr-video" muted playsInline />
            <button type="button" className="action-btn" onClick={stopCamera} style={{ marginTop: 10 }}>
              Parar câmera
            </button>
          </div>
        ) : (
          <button type="button" className="auth-scan" style={{ marginTop: 0 }} onClick={startScan}>
            <IconQrPlus size={18} />
            {scanState === 'unavailable' ? 'Câmera indisponível — use o campo abaixo' : 'Escanear QR Code'}
          </button>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field-card">
            <label className="field-label" htmlFor="tk-secret">Segredo ou URI</label>
            <input
              id="tk-secret"
              className="ed-input ed-input--mono"
              value={secretInput}
              onChange={(e) => { setSecretInput(e.target.value); setError(''); }}
              placeholder="JBSWY3DP… ou otpauth://totp/…"
              autoCapitalize="none"
            />
          </div>
          <div className="field-card">
            <label className="field-label" htmlFor="tk-issuer">Emissor</label>
            <input id="tk-issuer" className="ed-input" value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="Ex.: Google" />
          </div>
          <div className="field-card">
            <label className="field-label" htmlFor="tk-account">Conta</label>
            <input id="tk-account" className="ed-input" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Ex.: voce@email.com" autoCapitalize="none" />
          </div>

          {error && <div className="ob-error">{error}</div>}

          <div className="detail-actions">
            <button type="submit" className="action-btn action-btn--primary">Adicionar token</button>
          </div>
        </form>

        {vault && vault.tokens.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div className="set-section-title">Tokens existentes</div>
            <div className="set-group">
              {vault.tokens.map((t) => {
                const avatar = avatarFor(t.id, t.issuer);
                return (
                  <div className="set-row" key={t.id}>
                    <Avatar color={avatar.color} initial={avatar.initial} size={34} radius={10} fontSize={14} shadow={false} />
                    <div className="set-row-body">
                      <div className="set-row-title">{t.issuer}</div>
                      <div className="set-row-sub">{t.account}</div>
                    </div>
                    <button
                      type="button"
                      className="tk-remove"
                      onClick={() => window.confirm(`Remover o token de ${t.issuer}?`) && deleteToken(t.id)}
                    >
                      Remover
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
