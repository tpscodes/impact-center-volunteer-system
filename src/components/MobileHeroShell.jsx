// MobileHeroShell — canonical teal→navy gradient header wrapper used on every mobile screen.
// Renders the gradient background + bottom rounding. Pass remaining layout styles via `style`.
// Use `as="header"` for pages that use a semantic header element.
export default function MobileHeroShell({ children, style, className, as: Tag = 'div' }) {
  return (
    <Tag
      className={className}
      style={{
        background: 'linear-gradient(144deg, #0f7a70 14%, #0a2a3a 86%)',
        borderRadius: '0 0 28px 28px',
        color: '#fff',
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
