import { footer } from "@/content/home";

export function SiteFooter() {
  return (
    <footer className="site-footer" id="kontakt">
      <img src="/icons/logo-footer.svg" width={165} height={32} alt="Mindstreet" />
      <address>
        {footer.address.map((line) => (
          <span key={line}>{line}</span>
        ))}
        <a href={footer.phone.href}>{footer.phone.label}</a>
        <a href={`mailto:${footer.email}`}>{footer.email}</a>
      </address>
      <a
        className="linkedin"
        href={footer.linkedIn}
        target="_blank"
        rel="noreferrer"
        aria-label="Mindstreet på LinkedIn"
      >
        <img src="/icons/linkedin.svg" width={47} height={47} alt="" />
        <img
          className="linkedin-mark"
          src="/icons/linkedin-mark.svg"
          width={22}
          height={25}
          alt=""
        />
      </a>
    </footer>
  );
}
