import { Github, Linkedin, Users, Award, Sparkles } from "lucide-react";
import { TEAM_MEMBERS } from "../data/projectConfig.js";

function TeamCard({ member }) {
  return (
    <div
      className="group relative rounded-2xl p-6 border flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] shadow-lg"
      style={{
        background: "var(--panel-solid)",
        borderColor: "var(--line)",
      }}
    >
      <div>
        {/* Top: Avatar & Socials */}
        <div className="flex items-start justify-between mb-5">
          <div className="relative w-20 h-20 rounded-full p-1 border" style={{ borderColor: "rgba(231,168,87,0.4)" }}>
            <img
              src={member.photo}
              alt={member.name}
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%2312152a'><circle cx='50' cy='50' r='50' fill='%231e2238'/><text x='50' y='55' text-anchor='middle' fill='%239a9fc0' font-size='16' font-family='sans-serif'>VM</text></svg>";
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            {member.github && (
              <a
                href={member.github}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg border transition-colors hover:bg-[rgba(231,168,87,0.15)] echo-focus"
                style={{ borderColor: "var(--line)", color: "var(--ink-dim)" }}
                aria-label={`${member.name} GitHub`}
              >
                <Github size={14} />
              </a>
            )}
            {member.linkedin && (
              <a
                href={member.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg border transition-colors hover:bg-[rgba(231,168,87,0.15)] echo-focus"
                style={{ borderColor: "var(--line)", color: "var(--ink-dim)" }}
                aria-label={`${member.name} LinkedIn`}
              >
                <Linkedin size={14} />
              </a>
            )}
          </div>
        </div>

        {/* Member Name & Role */}
        <h3 className="echo-serif text-xl font-medium text-[var(--ink)] group-hover:text-[var(--ember)] transition-colors">
          {member.name}
        </h3>
        <p className="echo-mono text-xs mt-1 mb-3" style={{ color: "var(--violet)" }}>
          {member.role}
        </p>

        {/* Bio */}
        <p className="text-xs md:text-sm leading-relaxed mb-4" style={{ color: "var(--ink-dim)" }}>
          {member.bio}
        </p>
      </div>

      {/* Main Contribution Badge */}
      <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(42, 49, 84, 0.5)" }}>
        <div className="flex items-start gap-2">
          <Award size={14} className="shrink-0 mt-0.5" style={{ color: "var(--ember)" }} />
          <div>
            <span className="echo-mono text-[10px] uppercase tracking-wider block" style={{ color: "var(--ink-dim)" }}>
              Key Contribution
            </span>
            <span className="text-xs font-medium text-[var(--ink)]">
              {member.contribution}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TeamSection() {
  return (
    <section id="team" className="relative w-full py-20 px-8 md:px-16 border-t" style={{ borderColor: "var(--line)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[rgba(139,135,217,0.3)] bg-[rgba(139,135,217,0.08)] mb-4">
            <Users size={14} style={{ color: "var(--violet)" }} />
            <span className="echo-mono text-xs tracking-wider uppercase" style={{ color: "var(--violet)" }}>
              Collaborative Engineering
            </span>
          </div>
          <h2 className="echo-serif text-4xl font-medium mb-3">
            Meet Team VISORA
          </h2>
          <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--ink-dim)" }}>
            The interdisciplinary team behind the research, architecture, and realization of the Digital Memory Companion.
          </p>
        </div>

        {/* Team Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {TEAM_MEMBERS.map((member, idx) => (
            <TeamCard key={idx} member={member} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default TeamSection;
