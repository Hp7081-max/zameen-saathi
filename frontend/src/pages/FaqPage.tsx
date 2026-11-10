import FaqList from "../components/FaqList";
import Page from "../components/Page";
import type { Site } from "../site";

export default function FaqPage({ t }: { t: Site }) {
  return <Page title={t.nav_faq}><FaqList items={t.faq} /></Page>;
}
