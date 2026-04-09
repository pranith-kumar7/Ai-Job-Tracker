import type { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  description: string;
  eyebrow: string;
  footer: ReactNode;
  children: ReactNode;
}

export default function AuthLayout({
  title,
  description,
  eyebrow,
  footer,
  children,
}: AuthLayoutProps) {
  return (
    <div className="auth-shell">
      <section className="auth-panel auth-panel--story">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="hero-title">Turn every job search into a visible pipeline.</h1>
        <p className="hero-copy">
          Parse pasted job descriptions, capture role-specific resume bullets, and
          move every opportunity across a board built for focused follow-through.
        </p>

        <div className="feature-stack">
          <article className="feature-card">
            <h2>AI-assisted intake</h2>
            <p>Paste a JD once and let the app prefill the role, skills, and location.</p>
          </article>
          <article className="feature-card">
            <h2>One board, five stages</h2>
            <p>Track every application from Applied to Offer without losing notes.</p>
          </article>
          <article className="feature-card">
            <h2>Tailored resume prompts</h2>
            <p>Keep 3 to 5 role-specific bullet suggestions ready to copy and adapt.</p>
          </article>
        </div>
      </section>

      <section className="auth-panel auth-panel--form">
        <div className="auth-card">
          <p className="eyebrow eyebrow--compact">{eyebrow}</p>
          <h2 className="auth-title">{title}</h2>
          <p className="auth-description">{description}</p>
          {children}
          <div className="auth-footer">{footer}</div>
        </div>
      </section>
    </div>
  );
}
