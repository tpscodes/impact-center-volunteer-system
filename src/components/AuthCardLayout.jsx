// AuthCardLayout — shared wrapper for all Volo auth screens.
//
// Breakpoints (match pixel-verified HTML prototypes):
//   >900px   : desktop — illus left (560px), form right, full-bleed bg behind card
//   480–900px: tablet  — stacked, illus = 180px top band, card max-width 480px
//   ≤480px   : small tablet — illus band 150px, tighter padding
//   ≤600px   : phone  — Figma node 373:11502 — illustration is a SEPARATE full-bleed
//              hero (37px top gap, 425px tall, cover), card floats up with -114px
//              margin-top; full-bleed bg div is hidden entirely

const css = `
  .auth-bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    background-color: #E6F5F3;
  }
  .auth-page {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 24px;
    box-sizing: border-box;
  }
  .auth-inner-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    width: 100%;
    max-width: 1140px;
  }
  .auth-card {
    background: #ffffff;
    border-radius: 23px;
    box-shadow: 0 8px 32px rgba(10,41,59,0.10);
    display: flex;
    align-items: stretch;
    gap: 15px;
    overflow: hidden;
    padding: 30px;
    width: 100%;
    max-width: 1140px;
    opacity: 0;
    animation: auth-card-in 0.7s cubic-bezier(0.16,1,0.3,1) forwards;
  }
  .auth-illus {
    flex: 0 0 560px;
    max-width: 560px;
    min-height: 640px;
    border-radius: 16px;
    overflow: hidden;
    background-color: #ffffff;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    opacity: 0;
    animation: auth-illus-in 0.9s cubic-bezier(0.16,1,0.3,1) 0.15s forwards;
  }
  .auth-form-col {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 22px;
    padding: 10px 30px;
    box-sizing: border-box;
  }
  .auth-attribution {
    font-size: 12px;
    color: #6B7280;
    font-style: italic;
    text-align: center;
    margin: 0;
  }

  /* ── Tablet (480px – 900px) ─────────────────────────────────── */
  @media (max-width: 900px) {
    .auth-card {
      flex-direction: column;
      max-width: 480px;
      padding: 0;
    }
    .auth-illus {
      flex: none;
      width: 100%;
      max-width: 100%;
      height: 180px;
      min-height: 180px;
      border-radius: 23px 23px 0 0;
    }
    .auth-form-col {
      padding: 28px 28px 32px;
    }
  }

  /* ── Small tablet (≤480px) ──────────────────────────────────── */
  @media (max-width: 480px) {
    .auth-page { padding: 20px 16px; }
    .auth-illus { height: 150px; min-height: 150px; }
    .auth-form-col { padding: 24px 20px 28px; gap: 18px; }
  }

  /* ── Phone (≤600px) — Figma spec, must come AFTER 480px block ─
     At ≤600px the full-bleed bg is hidden; illustration sits above
     the card as a separate hero element; card floats up over it.    */
  @media (max-width: 600px) {
    .auth-bg   { display: none; }
    .auth-page {
      display: block;
      padding: 0;
      min-height: auto;
      align-items: flex-start;
      background: #fffefe;
    }
    .auth-inner-wrap {
      max-width: 100%;
      gap: 0;
    }
    .auth-card {
      flex-direction: column;
      width: 100%;
      max-width: 100%;
      padding: 0;
      border: none;
      box-shadow: none;
      border-radius: 0;
      overflow: visible;
      min-height: auto;
      align-items: stretch;
      /* disable mount animation on phone */
      opacity: 1;
      transform: none;
      animation: none;
    }
    .auth-illus {
      width: 100%;
      max-width: 100%;
      height: 425px;
      min-height: 425px;
      margin-top: 37px;
      border-radius: 0;
      /* cover fills the hero panel fully */
      background-size: cover;
      background-position: center 15%;
      opacity: 1;
      transform: none;
      animation: none;
    }
    .auth-form-col {
      /* pull card up 114px over the illustration bottom (99px visual overlap) */
      margin-top: -114px;
      position: relative;
      z-index: 2;
      background: #ffffff;
      border: 1px solid rgba(10,42,58,0.48);
      border-radius: 40px 40px 0 0;
      box-shadow: 0 8px 32px 0 #0a293b;
      padding: 40px;
      gap: 24px;
      flex: none;
      align-items: center;
      justify-content: flex-start;
    }
  }

  /* ── Reduced motion ─────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .auth-card  { animation: none !important; opacity: 1 !important; transform: none !important; }
    .auth-illus { animation: none !important; opacity: 1 !important; transform: none !important; }
  }
`;

export default function AuthCardLayout({ bgImage, illusImage, illusAlt, attribution, children }) {
  return (
    <>
      <style>{css}</style>
      <div
        className="auth-bg"
        style={bgImage ? { backgroundImage: `url(${bgImage})` } : undefined}
      />
      <div className="auth-page">
        <div className="auth-inner-wrap">
          <div className="auth-card">
            <div
              className="auth-illus"
              role="img"
              aria-label={illusAlt || 'Illustration'}
              style={illusImage ? { backgroundImage: `url(${illusImage})` } : undefined}
            />
            <div className="auth-form-col">
              {children}
              {attribution && (
                <p className="auth-attribution">{attribution}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
