import { Mail, MessageCircle, Github, Linkedin, AlertTriangle, HelpCircle } from "lucide-react";
import { CONTACT_CONFIG } from "../data/projectConfig.js";

export function ContactSection() {
  const contactButtons = [
    {
      id: "email",
      label: "Email Team",
      value: CONTACT_CONFIG.email,
      href: `mailto:${CONTACT_CONFIG.email}`,
      icon: Mail,
      accent: "var(--ember)",
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      value: CONTACT_CONFIG.whatsapp,
      href: `https://wa.me/${CONTACT_CONFIG.whatsapp.replace(/[^0-9]/g, "")}`,
      icon: MessageCircle,
      accent: "#25D366",
    },
    {
      id: "github",
      label: "GitHub Repository",
      value: CONTACT_CONFIG.github,
      href: CONTACT_CONFIG.github,
      icon: Github,
      accent: "var(--ink)",
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      value: CONTACT_CONFIG.linkedin,
      href: CONTACT_CONFIG.linkedin,
      icon: Linkedin,
      accent: "#0077B5",
    },
    {
      id: "issueUrl",
      label: "Report an Issue",
      value: CONTACT_CONFIG.issueUrl,
      href: CONTACT_CONFIG.issueUrl,
      icon: AlertTriangle,
      accent: "#f43f5e",
    },
  ];

  // Only display contact options that have a non-empty configured value
  const activeButtons = contactButtons.filter((btn) => Boolean(btn.value && btn.value.trim() !== ""));

  return (
    <section id="contact" className="relative w-full py-20 px-8 md:px-16 border-t" style={{ borderColor: "var(--line)" }}>
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[rgba(231,168,87,0.3)] bg-[rgba(231,168,87,0.08)] mb-4">
          <HelpCircle size={14} style={{ color: "var(--ember)" }} />
          <span className="echo-mono text-xs tracking-wider uppercase" style={{ color: "var(--ember)" }}>
            Support & Channels
          </span>
        </div>

        <h2 className="echo-serif text-4xl font-medium mb-4">
          Need Help?
        </h2>

        <p className="text-base md:text-lg max-w-2xl mx-auto mb-10" style={{ color: "var(--ink-dim)" }}>
          Have a question, found an issue, or want to know more about the project? Get in touch with our team.
        </p>

        {activeButtons.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-4">
            {activeButtons.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="echo-focus group inline-flex items-center gap-2.5 px-6 py-3 rounded-xl border text-sm font-medium transition-all duration-200 hover:scale-105 shadow-md"
                  style={{
                    background: "var(--panel-solid)",
                    borderColor: "var(--line)",
                    color: "var(--ink)",
                  }}
                >
                  <Icon size={16} style={{ color: item.accent }} className="transition-transform group-hover:rotate-6" />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-2xl border text-sm max-w-md mx-auto" style={{ borderColor: "var(--line)", color: "var(--ink-dim)" }}>
            Contact channels are currently being configured in <code className="text-xs echo-mono text-[var(--ember)]">projectConfig.js</code>.
          </div>
        )}
      </div>
    </section>
  );
}

export default ContactSection;
