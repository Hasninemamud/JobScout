import { companyHue } from "@/shared/lib/companyHue";

export function CompanyAvatar({ company, logo }: { company: string; logo: string | null }) {
  if (logo) {
    return <img className="avatar" src={logo} alt="" loading="lazy" referrerPolicy="no-referrer" />;
  }
  return (
    <div className="avatar avatar--fallback" data-hue={companyHue(company)} aria-hidden="true">
      {company.trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}
