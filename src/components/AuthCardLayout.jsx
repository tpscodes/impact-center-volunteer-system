// AuthCardLayout — shared two-column card wrapper for all Volo auth screens.
// Place illustration images in /public and pass their paths via illusImage / bgImage.
// Responsive: desktop = side-by-side (illus left, form right).
//             ≤900px  = stacked (illus top band 180px, form below).
//             ≤480px  = illus band shrinks to 150px, tighter padding.

const EASE = 'cubic-bezier(0.16,1,0.3,1)';

const css = `
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
  .auth-bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    background-color: #E6F5F3;
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
    animation: auth-card-in 0.7s cubic-bezier(0.16,1,0.3,1) forwards;
    opacity: 0;
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
    animation: auth-illus-in 0.9s cubic-bezier(0.16,1,0.3,1) 0.15s forwards;
    opacity: 0;
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
    margin-top: 2px;
    position: relative;
    z-index: 1;
  }
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
  @media (max-width: 480px) {
    .auth-page { padding: 20px 16px; }
    .auth-illus { height: 150px; min-height: 150px; }
    .auth-form-col { padding: 24px 20px 28px; gap: 18px; }
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%', maxWidth: 1140 }}>
          <div className="auth-card">
            <div
              className="auth-illus"
              role="img"
              aria-label={illusAlt || 'Illustration'}
              style={illusImage ? { backgroundImage: `url(${illusImage})` } : undefined}
            />
            <div className="auth-form-col">
              {children}
            </div>
          </div>
          {attribution && (
            <p className="auth-attribution">{attribution}</p>
          )}
        </div>
      </div>
    </>
  );
}
