import { IconChevron } from "./Icons";

/** सवाल-जवाब की तह (native <details>: कीबोर्ड और स्क्रीन-रीडर पर बिना अतिरिक्त कोड के ठीक चलता है)। */
export default function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="faq">
      {items.map((i) => (
        <details key={i.q} className="faq-item">
          <summary><span>{i.q}</span><IconChevron size={20} /></summary>
          <p>{i.a}</p>
        </details>
      ))}
    </div>
  );
}
