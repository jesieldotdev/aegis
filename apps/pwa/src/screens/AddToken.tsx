import { useEffect, useRef, useState, type FormEvent } from 'react';
import jsQR from 'jsqr';
import { Avatar, IconChevronLeft, IconQrPlus } from '@aegis/ui';
import { avatarFor, parseOtpAuth } from '@aegis/core';
import { useApp } from '../store';

/**
 * Adição de token 2FA: leitor de QR Code via câmera com entrada manual como
 * alternativa. Também lista os tokens existentes para remoção.
 *
 * A decodificação usa jsQR (puro JS, lê um <canvas> com o frame do vídeo)
 * em vez do BarcodeDetector nativo do navegador: esse último só existe no
 * Chrome Android/ChromeOS por padrão — no Chrome desktop (Windows/Mac/
 * Linux), Firefox e Safari ele não está disponível, então o scanner nunca
 * funcionava fora do celular.
 */
export function AddToken() {
  const { vault, closeAddToken, addToken, deleteToken } = useApp();
  const [issuer, setIssuer] = useState('');
  const [account, setAccount] = useState('');
  const [secretInput, setSecretInput] = useState('');
  const [error, setError] = useState('');
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'unavailable'>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanState('idle');
  };

  useEffect(() => stopCamera, []);

  const startScan = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanState('unavailable');
      return;
    }
    try {
      // No celular prefere a câmera traseira; no desktop não existe essa
      // distinção e o navegador ignora a preferência, caindo na webcam.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setScanState('scanning');
    } catch {
      stopCamera();
      setScanState('unavailable');
    }
  };

  // Liga o stream ao <video> só depois que `scanState` vira 'scanning' e o
  // React já montou o elemento — ligar antes (ainda no clique) pega
  // `videoRef.current` nulo, porque o <video> só existe no DOM condicional
  // quando scanState === 'scanning', e o re-render ainda não aconteceu. Sem
  // isso o srcObject nunca é atribuído e a tela da câmera fica preta.
  useEffect(() => {
    if (scanState !== 'scanning') return;
    const stream = streamRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!stream || !video || !canvas) return;

    let cancelled = false;
    let frameId = 0;
    video.srcObject = stream;
    video
      .play()
      .then(() => {
        if (cancelled) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        const tick = () => {
          if (cancelled || !streamRef.current) return;
          if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(frame.data, frame.width, frame.height);
            const parsed = code && parseOtpAuth(code.data);
            if (parsed) {
              setIssuer(parsed.issuer);
              setAccount(parsed.account);
              setSecretInput(parsed.secret);
              stopCamera();
              return;
            }
          }
          frameId = requestAnimationFrame(tick);
        };
        frameId = requestAnimationFrame(tick);
      })
      .catch(() => {
        if (!cancelled) {
          stopCamera();
          setScanState('unavailable');
        }
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [scanState]);

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
            <canvas ref={canvasRef} style={{ display: 'none' }} />
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
