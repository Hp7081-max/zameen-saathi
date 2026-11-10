import type { ReactNode } from "react";

/** अंदर के पन्नों का साँचा: एक ही h1 (route बदलने पर फ़ोकस यहीं आता है), फिर सामग्री। */
export default function Page({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="page" aria-labelledby="page-title">
      <header className="page-head">
        <h1 id="page-title" tabIndex={-1}>{title}</h1>
        {lead && <p className="lead muted">{lead}</p>}
      </header>
      {children}
    </section>
  );
}
