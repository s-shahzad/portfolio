export type NavLink = { label: string; href: string };

export type FeaturedItem = {
  id: string;
  chip: string;
  title: string;
  lines: string[];
  tags: string[];
  linkLabel: string;
  linkHref: string;
};

export type PublicationItem = {
  id: string;
  chip: string;
  title: string;
  summary: string;
  details: string[];
  badges: string[];
  actions: { label: string; href: string; isCitationButton?: boolean; citationText?: string }[];
  readLink: string;
};

export type CertificationItem = {
  id: string;
  category: ("security" | "cloud" | "data" | "ml")[];
  provider: string;
  title: string;
  summary: string;
  badges: string[];
  verifyLink?: string;
  isExtra?: boolean;
  dateText?: string;
};

export type SkillGroup = { id: string; title: string; skills: string[] };

export type EducationItem = {
  id: string;
  school: string;
  degree: string;
  location: string;
  date: string;
};

export type ExperienceItem = {
  id: string;
  company: string;
  role: string;
  location: string;
  duration: string;
  impact: string;
  points: string[];
};

export const NAV_LINKS: NavLink[] = [
  { label: "Featured Work", href: "#featured" },
  { label: "Publications", href: "#publications" },
  { label: "Certifications", href: "#certifications" },
  { label: "Experience", href: "#experience" },
  { label: "Skills", href: "#skills" },
  { label: "Contact", href: "#contact" },
];

export const HERO = {
  eyebrow: "Portfolio 2026",
  name: "Azhad Shahzad Shaik",
  subtitles: [
    "Cybersecurity & ML Engineer",
    "IEEE-published · SOC & threat analysis experience · Healthcare + IoT security",
  ],
  availability: "Open to full-time roles • US • Hybrid/Remote",
  ctaPrimary: { label: "View Security & ML Work", href: "#featured" },
  ctaSecondary: {
    label: "Download Resume",
    href: "/assets/Azhad_Shahzad_Shaik_Cybersecurity_Engineer_Resume.pdf",
  },
  cardTitle: "Currently",
  cardBody: "Focused on ML-driven threat detection and secure data pipelines.",
  cardMetaLabel: "Based in",
  cardMetaValue: "United States",
  imageSrc: "/assets/profile.png",
};

export const FEATURED: FeaturedItem[] = [
  {
    id: "featured-1",
    chip: "IEEE",
    title: "ML-based DoS Detection for EV Charging Infrastructure",
    lines: [
      "Problem: DoS risk in EV charging networks.",
      "Action: Built an ML-based intrusion detection approach for EVCS traffic.",
      "Impact: Strengthened detection readiness for connected infrastructure.",
    ],
    tags: ["ML", "IDS", "IoT", "EVCS"],
    linkLabel: "View case study",
    linkHref: "https://ieeexplore.ieee.org/document/11275540",
  },
  {
    id: "featured-2",
    chip: "SOC / Threat Analysis",
    title: "Enterprise Risk & Threat Analysis (Internship)",
    lines: [
      "Problem: Limited visibility into security maturity and risk exposure.",
      "Action: Mapped findings to NIST risk categories and incident patterns.",
      "Impact: Delivered prioritized remediation guidance tied to business impact.",
    ],
    tags: ["NIST", "Risk", "IR", "SOC"],
    linkLabel: "View case study",
    linkHref: "#contact",
  },
  {
    id: "featured-3",
    chip: "Healthcare Data",
    title: "HL7 -> FHIR Data Integration for Clinical Systems",
    lines: [
      "Problem: Interoperability gaps across clinical data systems.",
      "Action: Validated and mapped HL7 messages into FHIR resources.",
      "Impact: Improved deployment-ready data exchange and compliance.",
    ],
    tags: ["HL7", "FHIR", "Data QA", "Healthcare"],
    linkLabel: "View case study",
    linkHref: "#contact",
  },
];

export const PUBLICATIONS: PublicationItem[] = [
  {
    id: "pub-1",
    chip: "Journal",
    title:
      "Remote monitoring system of heart conditions for elderly persons with ECG machine using IoT platform",
    summary:
      "Built an IoT-based ECG monitoring framework to enable remote, continuous screening for elderly patients.",
    details: [
      "Authors: Singh Ngangbam Phalguni, Aditya Kanakamalla, Shahzad Shaik Azhad, Sai Guntupalli Divya, Shruti Suman",
    ],
    badges: [
      "JIST",
      "Vol 10 · Issue 1",
      "Pages 11-19",
      "2022-01-01",
      "ISSN 2322-1437",
      "EISSN 2345-2773",
      "jist.acecr.org",
    ],
    actions: [
      { label: "Open DOI", href: "https://doi.org/10.52547/jist.15692.10.37.11" },
      {
        label: "Copy citation",
        href: "#",
        isCitationButton: true,
        citationText:
          "Singh Ngangbam Phalguni, Aditya Kanakamalla, Shahzad Shaik Azhad, Sai Guntupalli Divya, Shruti Suman. Remote monitoring system of heart conditions for elderly persons with ECG machine using IoT platform. Journal of Information Systems and Telecommunication (JIST), 2022. DOI: 10.52547/jist.15692.10.37.11",
      },
    ],
    readLink: "https://jist.ir/en/article/15692",
  },
  {
    id: "pub-2",
    chip: "Research",
    title:
      "Plugged-in and Protected: Leveraging Machine Learning to Secure IoT-Based Electric Vehicle Charging Stations from Denial-of-Service Threats",
    summary:
      "Applied ML-based intrusion detection to reduce DoS risk in EV charging networks.",
    details: [
      "Authors: Azhad Shahzad Shaik, Meghana Gutla, Athma Phanindhra Raju Kagitala, Sajal Bhatia",
    ],
    badges: [
      "GCAIoT 2025",
      "IEEE",
      "Ben Guerir, Morocco",
      "Nov 23-25, 2025",
      "DOI 10.1109/GCAIoT68269.2025.11275540",
      "ISBN 979-8-3315-6879-5",
    ],
    actions: [
      { label: "Open DOI", href: "https://doi.org/10.1109/GCAIoT68269.2025.11275540" },
      {
        label: "Copy citation",
        href: "#",
        isCitationButton: true,
        citationText:
          "Azhad Shahzad Shaik, Meghana Gutla, Athma Phanindhra Raju Kagitala, Sajal Bhatia. Plugged-in and Protected: Leveraging Machine Learning to Secure IoT-Based Electric Vehicle Charging Stations from Denial-of-Service Threats. 2025 IEEE Global Conference on Artificial Intelligence and Internet of Things (GCAIoT). DOI: 10.1109/GCAIoT68269.2025.11275540",
      },
    ],
    readLink: "https://ieeexplore.ieee.org/document/11275540",
  },
];

export const CERTIFICATIONS: CertificationItem[] = [
  {
    id: "cert-1",
    category: ["security"],
    provider: "CompTIA",
    title: "Security+",
    summary: "Validates foundational cybersecurity knowledge across threats, risk, and mitigation.",
    badges: ["Certified Oct 2, 2025", "Valid through Oct 2, 2028"],
    dateText: "2025-10-02",
  },
  {
    id: "cert-2",
    category: ["ml", "data"],
    provider: "HackerRank",
    title: "Python (Basic)",
    summary: "Certification of skill in Python fundamentals and core programming concepts.",
    badges: ["Earned May 15, 2025", "ID E3EF8F866323"],
    verifyLink: "https://www.hackerrank.com/certificates/ee3fef866323",
    dateText: "2025-05-15",
  },
  {
    id: "cert-3",
    category: ["ml", "data"],
    provider: "HackerRank",
    title: "Problem Solving (Basic)",
    summary: "Certification of foundational problem-solving and algorithmic reasoning skills.",
    badges: ["Earned Sep 15, 2020", "ID A99E37EE6E6C"],
    verifyLink: "https://www.hackerrank.com/certificates/a99e37eeee6c",
    dateText: "2020-09-15",
  },
  {
    id: "cert-4",
    category: ["ml", "data"],
    provider: "HackerRank",
    title: "Problem Solving (Intermediate)",
    summary: "Certification validating intermediate-level problem solving and algorithmic skills.",
    badges: ["Earned Sep 12, 2020", "ID F137B6531CCC"],
    verifyLink: "https://www.hackerrank.com/certificates/f137b6531ccc",
    dateText: "2020-09-12",
  },
  {
    id: "cert-5",
    category: ["security"],
    provider: "Fortinet",
    title: "NSE 2 Network Security Associate",
    summary: "Certification covering network security fundamentals and Fortinet security concepts.",
    badges: ["Verified"],
    verifyLink:
      "https://training.fortinet.com/mod/customcert/verify_certificate.php?contextid=251440&code=MBGdIukeds&qrcode=1",
  },
  {
    id: "cert-6",
    category: ["security"],
    provider: "Fortinet",
    title: "NSE 1 Network Security Associate",
    summary: "Certification covering foundational security concepts and Fortinet network security basics.",
    badges: ["Verified"],
    verifyLink:
      "https://training.fortinet.com/mod/customcert/verify_certificate.php?contextid=251439&code=NudBeGrVP0&qrcode=1",
  },
];

export const SKILL_GROUPS: SkillGroup[] = [
  {
    id: "skill-1",
    title: "Core Security",
    skills: ["Threat Modeling", "Risk Assessment", "Vulnerability Analysis", "Incident Response"],
  },
  {
    id: "skill-2",
    title: "Data & ML",
    skills: ["Python", "Data Validation", "ML-based Detection"],
  },
  {
    id: "skill-3",
    title: "Cloud",
    skills: ["AWS"],
  },
  {
    id: "skill-4",
    title: "Tools",
    skills: ["Wireshark", "Nmap", "Linux", "PowerShell", "TCP/IP"],
  },
];

export const EDUCATION: EducationItem[] = [
  {
    id: "edu-1",
    school: "Sacred Heart University",
    degree: "M.S. in Cyber/Computer Forensics and Counterterrorism",
    location: "Fairfield, Connecticut, USA",
    date: "Mar 2025",
  },
  {
    id: "edu-2",
    school: "Koneru Lakshmaiah College of Engineering",
    degree: "B.Tech in Electronics and Communications Engineering",
    location: "Guntur, Andhra Pradesh, India",
    date: "May 2021",
  },
];

export const EXPERIENCE: ExperienceItem[] = [
  {
    id: "exp-1",
    company: "Solstice Solutions, Inc.",
    role: "Jr. Data Analyst",
    location: "Hartford, CT",
    duration: "Oct 2025 - Present",
    impact: "Impact: Improved interoperability readiness for healthcare deployments.",
    points: [
      "Mapped HL7 -> FHIR to resolve interoperability gaps and accelerate deployment-ready exchange.",
      "Validated and transformed clinical datasets to prevent schema errors and improve data quality.",
      "Standardized mappings and workflows to reduce rework cycles for stakeholders.",
    ],
  },
  {
    id: "exp-2",
    company: "Infosysnow Inc.",
    role: "Cyber Security Engineer",
    location: "Remote",
    duration: "Aug 2025 - Oct 2025",
    impact: "Impact: Strengthened detection and remediation readiness across environments.",
    points: [
      "Hardened security protocols to reduce unauthorized access risk across systems.",
      "Triaged anomalous traffic to surface incidents faster and support corrective action.",
      "Delivered vulnerability findings and remediation guidance to close high-risk exposure points.",
    ],
  },
  {
    id: "exp-3",
    company: "iQ4",
    role: "IT Risk Analyst Intern",
    location: "Remote",
    duration: "May 2024 - Aug 2024",
    impact: "Impact: Delivered prioritized risk insights tied to business impact.",
    points: [
      "Assessed enterprise controls to expose governance and operational gaps.",
      "Mapped findings to NIST risk categories to prioritize remediation.",
      "Translated incident patterns into risk statements tied to business impact.",
    ],
  },
];

export const CONTACT = {
  heading: "Let's Build",
  subtitle: "Let's talk about security & ML roles.",
  email: "shaikazhadshahzad@gmail.com",
  githubLabel: "github.com/s-shahzad",
  githubLink: "https://github.com/s-shahzad",
  response: "Responding within 24-48 hours.",
};

export const FOOTER = "© 2026 Azhad Shahzad Shaik. All rights reserved.";
