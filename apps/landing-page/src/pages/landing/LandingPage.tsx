import { useTranslation } from "react-i18next";
import { useDocumentLocale } from "../../i18n/useLocale";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { ClosingSection } from "./sections/ClosingSection";
import { DaylineSection } from "./sections/DaylineSection";
import { FeaturesSection } from "./sections/FeaturesSection";
import { HeroSection } from "./sections/HeroSection";
import { MethodSection } from "./sections/MethodSection";
import { PrivacySection } from "./sections/PrivacySection";
import { VerseSection } from "./sections/VerseSection";
import { WidgetSection } from "./sections/WidgetSection";

export function LandingPage() {
  const { t } = useTranslation("landing");
  useDocumentLocale({ title: t("documentTitle"), description: t("documentDescription") });

  return (
    <div className="overflow-hidden bg-nur antialiased">
      <SiteHeader />
      <main id="top">
        <HeroSection />
        <FeaturesSection />
        <WidgetSection />
        <DaylineSection />
        <MethodSection />
        <PrivacySection />
        <VerseSection />
        <ClosingSection />
      </main>
      <SiteFooter />
    </div>
  );
}
