// Careers vacancies are data-driven. Keep status="published" only while RC is actively recruiting for the role.
// Do not add customer names, salary figures, sponsorship promises or benefits unless they are approved for publication.

const STANDARD_EMPLOYMENT_TERMS = [
  "Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.",
  "Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."
];

export const CAREER_JOBS = [
  {
    slug: "senior-data-engineer",
    jobCode: "RC-DATA-001",
    title: "Senior Data Engineer",
    department: "Data & Analytics",
    status: "published",
    summary: "Design and build dependable data pipelines and analytical platforms for enterprise transformation programmes across multiple industry contexts.",
    location: "London, UK",
    workStyle: "Hybrid / client-aligned",
    employmentType: "Full-time",
    experience: "5–8 years",
    postedDate: "2026-09-08",
    closingDate: "",
    industries: ["Banking & Finance", "Automotive", "Media", "Education"],
    technologies: ["Python", "SQL", "PySpark", "Azure Data Factory", "Databricks", "Microsoft Fabric", "dbt", "Git"],
    description: [
      "The Senior Data Engineer will design, implement and operate data pipelines, transformation layers and analytical data products used by client delivery teams and business stakeholders.",
      "The role requires strong engineering judgement around data quality, lineage, performance, security, orchestration and operational support rather than pipeline development in isolation."
    ],
    responsibilities: [
      "Design batch and streaming ingestion patterns, transformation pipelines and reusable data components.",
      "Build and maintain data models, validation controls, orchestration, monitoring and failure-recovery patterns.",
      "Work with architects, analysts, application teams and client stakeholders to define data contracts and ownership boundaries.",
      "Review code, deployment pipelines and data-quality evidence before production release.",
      "Support production diagnosis and continuous improvement of data-platform reliability and cost."
    ],
    qualifications: [
      "5–8 years of professional data-engineering or closely related software-engineering experience.",
      "Strong SQL and Python skills with hands-on experience building production ETL/ELT pipelines.",
      "Experience with Spark/PySpark and at least one modern cloud data platform.",
      "Working knowledge of data modelling, data quality, orchestration, version control and CI/CD.",
      "Ability to explain technical trade-offs clearly to engineering and non-engineering stakeholders."
    ],
    preferredQualifications: [
      "Experience with Azure Data Factory, Databricks, Microsoft Fabric, dbt or equivalent platforms.",
      "Experience in regulated, high-volume or multi-system enterprise environments.",
      "Knowledge of data lineage, observability, governance and secure data-access patterns."
    ],
    benefits: STANDARD_EMPLOYMENT_TERMS,
    workingStyle: [
      "Work is organised around project outcomes, engineering standards, peer review and client delivery commitments.",
      "Hybrid attendance and client-site presence vary by engagement and are confirmed for the assigned project.",
      "Engineers are expected to document decisions, communicate delivery risk early and participate in technical review."
    ],
    locationDetails: "Primary employment location is London. Some engagements may require travel to a UK client location; the requirement will be confirmed before assignment."
  },
  {
    slug: "data-bi-engineer",
    jobCode: "RC-DATA-002",
    title: "Data & BI Engineer",
    department: "Data & Analytics",
    status: "published",
    summary: "Build governed analytical models, reporting datasets and business intelligence solutions that turn operational data into dependable decision support.",
    location: "London, UK",
    workStyle: "Hybrid",
    employmentType: "Full-time",
    experience: "3–5 years",
    postedDate: "2026-09-08",
    closingDate: "",
    industries: ["Banking & Finance", "Education", "Professional Services"],
    technologies: ["SQL", "Power BI", "DAX", "Microsoft Fabric", "dbt", "Python", "Excel", "Git"],
    description: [
      "The Data & BI Engineer will develop reporting datasets, semantic models, dashboards and reusable transformation logic for business and operational reporting.",
      "The role combines hands-on BI development with data-quality, metric-definition and stakeholder collaboration responsibilities."
    ],
    responsibilities: [
      "Develop reusable SQL transformations, analytical models and reporting datasets.",
      "Create Power BI semantic models, measures and dashboards with consistent metric definitions.",
      "Work with users to translate reporting needs into governed data and visualisation requirements.",
      "Implement data-quality checks, refresh monitoring and release controls for reporting solutions.",
      "Document lineage, definitions, assumptions and known limitations for key business measures."
    ],
    qualifications: [
      "3–5 years of hands-on experience in BI, analytics engineering or data development.",
      "Strong SQL and practical Power BI/DAX experience.",
      "Understanding of dimensional modelling, data quality and dashboard performance.",
      "Experience working with business stakeholders to define measurable reporting requirements."
    ],
    preferredQualifications: [
      "Exposure to Microsoft Fabric, dbt, Python or cloud data platforms.",
      "Experience supporting finance, education or operational reporting environments."
    ],
    benefits: STANDARD_EMPLOYMENT_TERMS,
    workingStyle: [
      "The role combines independent analytical development with regular reviews of metric definitions and business context.",
      "Hybrid attendance is expected for collaboration, workshops and project delivery activities."
    ],
    locationDetails: "London-based hybrid role with occasional UK client-site workshops where required."
  },
  {
    slug: "senior-dotnet-full-stack-engineer",
    jobCode: "RC-APP-001",
    title: "Senior .NET Full Stack Engineer",
    department: "Application Engineering",
    status: "published",
    summary: "Engineer modern web applications, APIs and integration services using Microsoft technologies and contemporary front-end frameworks.",
    location: "London, UK",
    workStyle: "Hybrid / client-aligned",
    employmentType: "Full-time",
    experience: "5–10 years",
    postedDate: "2026-09-08",
    closingDate: "",
    industries: ["Banking & Finance", "Education", "Professional Services"],
    technologies: ["C#", ".NET 8", "ASP.NET Core", "REST APIs", "React", "Angular", "TypeScript", "SQL Server", "Azure"],
    description: [
      "The Senior .NET Full Stack Engineer will design and deliver secure, maintainable web applications and APIs across client and internal technology programmes.",
      "The role requires depth in backend engineering plus practical front-end capability, integration design, testing and production-readiness."
    ],
    responsibilities: [
      "Design and implement ASP.NET Core services, APIs and application components.",
      "Develop accessible, responsive front-end features using React or Angular and TypeScript.",
      "Design data access, validation, error handling, authentication and integration boundaries.",
      "Contribute to architecture reviews, code reviews, automated testing and CI/CD pipelines.",
      "Diagnose production issues and improve observability, resilience and maintainability."
    ],
    qualifications: [
      "5–10 years of professional software-development experience with strong C#/.NET capability.",
      "Hands-on experience with ASP.NET Core, REST APIs and relational databases.",
      "Professional experience with React or Angular and TypeScript.",
      "Understanding of secure development, automated testing, source control and CI/CD.",
      "Ability to work across architecture, engineering, QA and delivery stakeholders."
    ],
    preferredQualifications: [
      "Azure application, identity, messaging or container-platform experience.",
      "Experience with microservices, Docker, Kubernetes or event-driven integration.",
      "Experience delivering applications in regulated or enterprise environments."
    ],
    benefits: STANDARD_EMPLOYMENT_TERMS,
    workingStyle: [
      "Engineers work in cross-functional delivery teams with shared ownership for quality and production readiness.",
      "The role may involve client workshops, architecture discussions, implementation, code review and production-support collaboration."
    ],
    locationDetails: "London-based with hybrid working. Client-site attendance may be required for selected engagements."
  },
  {
    slug: "java-microservices-engineer",
    jobCode: "RC-APP-002",
    title: "Java Microservices Engineer",
    department: "Application Engineering",
    status: "published",
    summary: "Build resilient APIs, microservices and event-driven integrations for enterprise platforms with clear security and operational boundaries.",
    location: "UK",
    workStyle: "Client-aligned hybrid",
    employmentType: "Full-time",
    experience: "4–8 years",
    postedDate: "2026-09-08",
    closingDate: "",
    industries: ["Banking & Finance", "Automotive", "Media"],
    technologies: ["Java 17+", "Spring Boot", "REST", "Kafka", "PostgreSQL", "Docker", "Kubernetes", "Git"],
    description: [
      "The Java Microservices Engineer will design and implement backend services and integration components used in distributed enterprise systems.",
      "The role emphasises API design, event-driven integration, resilience, testability, observability and controlled deployment."
    ],
    responsibilities: [
      "Develop Spring Boot services, REST APIs and asynchronous integrations.",
      "Design service contracts, error handling, idempotency, resilience and security controls.",
      "Implement automated unit, integration and API tests.",
      "Contribute to containerisation, CI/CD, deployment configuration and production observability.",
      "Collaborate with architects, data teams and client engineers on integration design."
    ],
    qualifications: [
      "4–8 years of professional Java development experience.",
      "Strong Spring Boot, REST API and relational database experience.",
      "Understanding of distributed systems, messaging and service-to-service integration.",
      "Experience with automated testing, Git and CI/CD."
    ],
    preferredQualifications: [
      "Kafka or comparable event-streaming experience.",
      "Docker/Kubernetes and cloud-platform exposure.",
      "Experience in financial-services, automotive or high-volume digital platforms."
    ],
    benefits: STANDARD_EMPLOYMENT_TERMS,
    workingStyle: [
      "This role works closely with client-aligned engineering teams and follows agreed architecture, release and quality standards.",
      "Working location depends on the assigned engagement and may combine remote work with office or client-site collaboration."
    ],
    locationDetails: "UK-based role. Exact office and client-site expectations are confirmed with the project assignment."
  },
  {
    slug: "cloud-platform-engineer",
    jobCode: "RC-CLOUD-001",
    title: "Cloud Platform Engineer",
    department: "Cloud & Infrastructure",
    status: "published",
    summary: "Build secure cloud foundations, infrastructure automation and container platforms that development teams can operate consistently at enterprise scale.",
    location: "London, UK",
    workStyle: "Hybrid / client-aligned",
    employmentType: "Full-time",
    experience: "4–8 years",
    postedDate: "2026-09-08",
    closingDate: "",
    industries: ["Banking & Finance", "Media", "Education", "Automotive"],
    technologies: ["Azure", "AWS", "Terraform", "Docker", "Kubernetes", "Linux", "IAM", "Networking", "GitHub Actions"],
    description: [
      "The Cloud Platform Engineer will help establish and improve cloud environments used by application, data and integration workloads.",
      "The role includes infrastructure as code, identity, networking, container platforms, observability, resilience and repeatable delivery automation."
    ],
    responsibilities: [
      "Design and implement cloud infrastructure using reusable infrastructure-as-code modules.",
      "Configure identity, networking, secrets, logging and policy controls in line with project requirements.",
      "Build and support container and Kubernetes platform capabilities where appropriate.",
      "Automate environment provisioning, deployment and operational checks through CI/CD.",
      "Support cloud cost, reliability, security and operational-readiness reviews."
    ],
    qualifications: [
      "4–8 years of infrastructure, cloud or platform-engineering experience.",
      "Hands-on experience with Azure or AWS and infrastructure as code using Terraform or equivalent.",
      "Good understanding of networking, identity, Linux, containers and CI/CD.",
      "Experience troubleshooting production cloud and platform issues."
    ],
    preferredQualifications: [
      "Kubernetes administration or platform-engineering experience.",
      "Exposure to landing zones, policy-as-code, observability and FinOps practices.",
      "Cloud certification relevant to the technologies used in the assigned engagement."
    ],
    benefits: STANDARD_EMPLOYMENT_TERMS,
    workingStyle: [
      "Platform work is performed collaboratively with application, security, data and operations teams.",
      "Changes are expected to be automated, reviewable, repeatable and supported by operational evidence."
    ],
    locationDetails: "London-based hybrid role with potential UK client-site activity depending on the engagement."
  },
  {
    slug: "devops-sre-engineer",
    jobCode: "RC-PLAT-001",
    title: "DevOps / Site Reliability Engineer",
    department: "Platform Engineering",
    status: "published",
    summary: "Improve software delivery, deployment reliability, observability and operational resilience across cloud and application environments.",
    location: "UK",
    workStyle: "Hybrid / client-aligned",
    employmentType: "Full-time",
    experience: "4–8 years",
    postedDate: "2026-09-08",
    closingDate: "",
    industries: ["Banking & Finance", "Media", "Automotive", "Professional Services"],
    technologies: ["Azure DevOps", "GitHub Actions", "Jenkins", "Docker", "Kubernetes", "Terraform", "Prometheus", "Grafana", "Linux"],
    description: [
      "The DevOps / SRE Engineer will improve the path from source control to production and help delivery teams operate services with clearer reliability objectives and production telemetry.",
      "The role combines pipeline automation, platform engineering, observability, incident learning and reliability improvement."
    ],
    responsibilities: [
      "Build and improve CI/CD pipelines, deployment automation and environment controls.",
      "Implement observability through logs, metrics, traces, dashboards and actionable alerts.",
      "Support container platforms, infrastructure as code and release automation.",
      "Participate in incident review, root-cause analysis and reliability improvement work.",
      "Work with engineering teams to define operational readiness and service-level expectations."
    ],
    qualifications: [
      "4–8 years of DevOps, SRE, platform or production-engineering experience.",
      "Strong CI/CD, Linux and scripting/automation skills.",
      "Experience with containers, infrastructure as code and cloud environments.",
      "Understanding of monitoring, incident management and reliability engineering."
    ],
    preferredQualifications: [
      "Kubernetes and Terraform experience in production environments.",
      "Experience with Prometheus, Grafana, OpenTelemetry or equivalent observability tooling.",
      "Knowledge of SLOs, error budgets and production-readiness practices."
    ],
    benefits: STANDARD_EMPLOYMENT_TERMS,
    workingStyle: [
      "The role works across development and operations boundaries rather than as a release-only function.",
      "Engineers are expected to automate repeatable tasks and convert operational incidents into measurable improvement work."
    ],
    locationDetails: "UK-based client-aligned role. Working location and on-call expectations, if any, are confirmed before assignment."
  },
  {
    slug: "cyber-security-engineer",
    jobCode: "RC-SEC-001",
    title: "Cyber Security Engineer",
    department: "Cyber Security",
    status: "published",
    summary: "Strengthen security across identity, endpoints, cloud services and applications through practical controls, monitoring and risk-informed engineering.",
    location: "London, UK",
    workStyle: "Hybrid",
    employmentType: "Full-time",
    experience: "4–8 years",
    postedDate: "2026-09-08",
    closingDate: "",
    industries: ["Banking & Finance", "Education", "Professional Services"],
    technologies: ["Microsoft Entra ID", "SIEM", "EDR", "Azure Security", "AWS Security", "Vulnerability Management", "IAM", "Security Monitoring"],
    description: [
      "The Cyber Security Engineer will support defensive security design and implementation across client environments, with emphasis on identity, cloud, endpoints, application delivery and operational monitoring.",
      "The role is focused on authorised defensive work, security improvement and evidence-based control implementation."
    ],
    responsibilities: [
      "Assess security posture and identify practical control gaps across identity, cloud, endpoint and application environments.",
      "Support secure architecture reviews, hardening standards and security requirements for technology delivery.",
      "Improve vulnerability-management, security-monitoring and incident-readiness processes.",
      "Work with engineering teams to integrate security checks into delivery pipelines and operational processes.",
      "Document risks, control decisions, exceptions and remediation actions."
    ],
    qualifications: [
      "4–8 years of professional cyber-security, cloud-security or security-engineering experience.",
      "Strong understanding of IAM, endpoint security, vulnerability management and security monitoring.",
      "Practical experience securing Azure, AWS or comparable cloud environments.",
      "Ability to communicate risk and remediation priorities to technical and business stakeholders."
    ],
    preferredQualifications: [
      "Experience with SIEM, EDR, Microsoft Entra ID or comparable enterprise security tooling.",
      "Relevant security certification or demonstrable equivalent experience.",
      "Experience in regulated or security-sensitive enterprise environments."
    ],
    benefits: STANDARD_EMPLOYMENT_TERMS,
    workingStyle: [
      "Security engineers work as part of authorised client and delivery teams with clear scope and access boundaries.",
      "The role combines assessment, engineering, documentation and collaboration rather than isolated compliance reporting."
    ],
    locationDetails: "London-based hybrid role. Some engagements may require controlled access to a UK client environment."
  },
  {
    slug: "qa-automation-engineer",
    jobCode: "RC-QE-001",
    title: "QA Automation Engineer",
    department: "Quality Engineering",
    status: "published",
    summary: "Build automated quality coverage across web applications, APIs and integration workflows so delivery teams can release with stronger evidence and lower regression risk.",
    location: "UK",
    workStyle: "Hybrid",
    employmentType: "Full-time",
    experience: "3–6 years",
    postedDate: "2026-09-08",
    closingDate: "",
    industries: ["Banking & Finance", "Education", "Media", "Automotive"],
    technologies: ["Playwright", "Selenium", "Cypress", "Postman", "REST APIs", "JavaScript", "TypeScript", "JMeter", "CI/CD"],
    description: [
      "The QA Automation Engineer will design automated test coverage for user journeys, APIs and integration points and help teams move quality checks earlier in the delivery lifecycle.",
      "The role includes test strategy, automation, defect analysis, release evidence and collaboration with developers and product stakeholders."
    ],
    responsibilities: [
      "Design and maintain automated UI, API and integration test suites.",
      "Translate requirements and risk into practical test scenarios and acceptance evidence.",
      "Integrate automated tests into CI/CD pipelines and improve feedback speed.",
      "Investigate failures with developers and distinguish product defects from test or environment issues.",
      "Contribute to performance, accessibility and non-functional quality testing where required."
    ],
    qualifications: [
      "3–6 years of software testing or quality-engineering experience.",
      "Hands-on automation experience with Playwright, Selenium, Cypress or equivalent.",
      "API testing experience and good understanding of HTTP/REST concepts.",
      "Ability to write maintainable automation code and work with Git/CI pipelines."
    ],
    preferredQualifications: [
      "TypeScript or JavaScript automation experience.",
      "Performance-testing exposure using JMeter, k6 or equivalent.",
      "Experience testing cloud-hosted, data-intensive or regulated applications."
    ],
    benefits: STANDARD_EMPLOYMENT_TERMS,
    workingStyle: [
      "Quality engineering is embedded in delivery teams and begins during requirement and design discussions rather than after development completes.",
      "The role requires regular collaboration with developers, analysts, product stakeholders and release teams."
    ],
    locationDetails: "UK-based hybrid role. Client-site attendance may be required for selected programmes."
  },
  {
    slug: "application-support-engineer",
    jobCode: "RC-SUP-001",
    title: "Application Support Engineer",
    department: "IT Support Services",
    status: "published",
    summary: "Support business-critical applications through structured incident ownership, diagnosis, operational monitoring and continuous service improvement.",
    location: "London, UK",
    workStyle: "Hybrid / support-aligned",
    employmentType: "Full-time",
    experience: "3–6 years",
    postedDate: "2026-09-08",
    closingDate: "",
    industries: ["Banking & Finance", "Education", "Professional Services"],
    technologies: ["SQL", "Linux", "Windows Server", "REST APIs", "Monitoring", "ITSM", "Azure", "Log Analysis"],
    description: [
      "The Application Support Engineer will provide structured L2/L3 support for enterprise applications and related integrations, working with engineering teams to restore service and reduce repeat incidents.",
      "The role is operationally focused but requires strong technical analysis and communication."
    ],
    responsibilities: [
      "Own incident investigation and coordinate escalation across application, infrastructure and supplier teams.",
      "Use logs, SQL, monitoring and application knowledge to diagnose faults and identify root causes.",
      "Maintain runbooks, known-error records and service-support documentation.",
      "Support release validation, production changes and operational-readiness activities.",
      "Identify recurring issues and convert them into service-improvement or engineering actions."
    ],
    qualifications: [
      "3–6 years of application support, production support or technical operations experience.",
      "Good SQL, log-analysis and troubleshooting capability.",
      "Working knowledge of Linux or Windows server environments and web/API concepts.",
      "Strong incident communication and stakeholder-management skills."
    ],
    preferredQualifications: [
      "ITIL or service-management experience.",
      "Azure or other cloud-platform exposure.",
      "Experience supporting enterprise or regulated applications."
    ],
    benefits: STANDARD_EMPLOYMENT_TERMS,
    workingStyle: [
      "The role works to agreed service priorities, escalation paths and client operating procedures.",
      "Any shift, out-of-hours or on-call requirement will be stated for the assigned support engagement before appointment."
    ],
    locationDetails: "London-based role. Exact hybrid, shift and client-site requirements depend on the support assignment and are confirmed in advance."
  },
  {
    slug: "technical-business-analyst",
    jobCode: "RC-CONS-001",
    title: "Technical Business Analyst",
    department: "Technology Consulting",
    status: "published",
    summary: "Translate business problems into clear process, data, integration and technology requirements that engineering teams can implement and stakeholders can validate.",
    location: "London, UK",
    workStyle: "Hybrid / client-aligned",
    employmentType: "Full-time",
    experience: "3–7 years",
    postedDate: "2026-09-08",
    closingDate: "",
    industries: ["Banking & Finance", "Education", "Automotive", "Professional Services"],
    technologies: ["Jira", "Confluence", "BPMN", "UML", "REST APIs", "SQL", "Process Mapping", "Agile Delivery"],
    description: [
      "The Technical Business Analyst will work between business stakeholders and technology delivery teams to define requirements, process changes, interfaces and measurable acceptance criteria.",
      "The role suits analysts who can understand both business workflows and the technical implications of system, API and data changes."
    ],
    responsibilities: [
      "Facilitate discovery workshops and document current-state and target-state processes.",
      "Define functional, data, integration and non-functional requirements with clear acceptance criteria.",
      "Support API, data-mapping and system-integration discussions with engineering teams.",
      "Manage requirements traceability, assumptions, decisions and change impacts.",
      "Support testing, stakeholder validation and implementation readiness."
    ],
    qualifications: [
      "3–7 years of business-analysis experience in technology or digital-delivery environments.",
      "Strong requirements, process-mapping and stakeholder-facilitation skills.",
      "Understanding of APIs, data flows, system integration and software-delivery lifecycles.",
      "Experience working in Agile, hybrid or structured programme environments."
    ],
    preferredQualifications: [
      "SQL/data-analysis capability.",
      "Experience with BPMN/UML, Jira and Confluence.",
      "Industry experience in financial services, education, automotive or enterprise technology."
    ],
    benefits: STANDARD_EMPLOYMENT_TERMS,
    workingStyle: [
      "The role is workshop- and stakeholder-intensive and requires regular collaboration with client business, architecture and engineering teams.",
      "Analysts are expected to keep scope, assumptions, decisions and unresolved questions visible throughout delivery."
    ],
    locationDetails: "London-based hybrid role with client workshops and project meetings as required."
  },
  {
    slug: "technical-delivery-manager",
    jobCode: "RC-MGMT-001",
    title: "Technical Delivery Manager",
    department: "Strategy & Implementation",
    status: "published",
    summary: "Lead complex technology delivery across application, cloud, data and integration workstreams with clear governance, dependency management and release accountability.",
    location: "London, UK",
    workStyle: "Hybrid / client-aligned",
    employmentType: "Full-time",
    experience: "7–10 years",
    postedDate: "2026-09-08",
    closingDate: "",
    industries: ["Banking & Finance", "Automotive", "Media", "Education"],
    technologies: ["Agile Delivery", "Jira", "Azure DevOps", "Cloud Delivery", "APIs", "Data Platforms", "Release Governance", "Risk Management"],
    description: [
      "The Technical Delivery Manager will coordinate multi-disciplinary technology work from planning through release and operational handover.",
      "The role requires sufficient technical understanding to challenge dependencies, quality, architecture and operational-readiness decisions while maintaining delivery governance."
    ],
    responsibilities: [
      "Own delivery plans, milestones, dependencies, risks, decisions and stakeholder reporting.",
      "Coordinate engineering, QA, architecture, security, data and operational workstreams.",
      "Ensure scope changes, assumptions and delivery risks are visible and actively managed.",
      "Facilitate release readiness, go-live decisions and operational handover.",
      "Support commercial and resource planning where required by the engagement."
    ],
    qualifications: [
      "7–10 years of technology-delivery experience, including leadership of cross-functional teams.",
      "Strong understanding of software, cloud, data or integration delivery lifecycles.",
      "Demonstrated experience with risk, dependency, stakeholder and release management.",
      "Ability to communicate effectively with technical teams, client leadership and delivery partners."
    ],
    preferredQualifications: [
      "Experience delivering programmes in regulated or multi-supplier environments.",
      "Agile, Scrum, SAFe, PRINCE2 or comparable delivery certification where relevant.",
      "Experience with Azure DevOps, Jira or equivalent delivery-management tooling."
    ],
    benefits: STANDARD_EMPLOYMENT_TERMS,
    workingStyle: [
      "This is a client-facing delivery role with regular governance, planning and cross-team coordination responsibilities.",
      "Hybrid and client-site expectations depend on the programme and are confirmed for the assignment."
    ],
    locationDetails: "London-based with UK client-site attendance where the engagement requires it."
  },
  {
    slug: "automotive-integration-engineer",
    jobCode: "RC-AUTO-001",
    title: "Automotive Integration Engineer",
    department: "Automotive Technology",
    status: "published",
    summary: "Engineer reliable integration between connected-product, enterprise and operational systems in automotive and mobility environments.",
    location: "UK",
    workStyle: "Client-aligned hybrid",
    employmentType: "Full-time",
    experience: "4–8 years",
    postedDate: "2026-09-08",
    closingDate: "",
    industries: ["Automotive"],
    technologies: ["REST APIs", "Kafka", "MQTT", "Java or .NET", "Azure or AWS", "SQL", "Docker", "Observability"],
    description: [
      "The Automotive Integration Engineer will support integration across vehicle-related data flows, digital products and enterprise platforms for automotive and mobility programmes.",
      "The role focuses on interface reliability, event flows, data contracts, security boundaries and operational visibility."
    ],
    responsibilities: [
      "Design and implement APIs, messaging and event-driven integration patterns.",
      "Define data contracts, error handling, retry behaviour and interface monitoring.",
      "Work with product, enterprise and cloud teams to resolve cross-system dependencies.",
      "Support automated integration testing and production observability.",
      "Document interface ownership, operational procedures and known failure modes."
    ],
    qualifications: [
      "4–8 years of integration, backend or platform-engineering experience.",
      "Strong REST/API and messaging experience with Java, .NET or comparable backend technologies.",
      "Understanding of event-driven architectures and distributed-system reliability.",
      "Experience with cloud platforms, SQL and production troubleshooting."
    ],
    preferredQualifications: [
      "Automotive, mobility, telematics or connected-product experience.",
      "Kafka, MQTT, container or observability-platform experience.",
      "Knowledge of secure integration and high-volume event-processing patterns."
    ],
    benefits: STANDARD_EMPLOYMENT_TERMS,
    workingStyle: [
      "This role is strongly client- and integration-team aligned and may involve workshops with multiple system owners.",
      "The engineer is expected to make dependencies, interface assumptions and operational risks explicit throughout delivery."
    ],
    locationDetails: "UK client-aligned role. Exact location depends on the automotive programme and is confirmed before assignment."
  },
  {
    slug: "education-platform-engineer",
    jobCode: "RC-EDU-001",
    title: "Education Platform Full Stack Engineer",
    department: "Education Technology",
    status: "published",
    summary: "Build secure, accessible digital services and workflow platforms for education users, staff and administrative operations.",
    location: "London, UK",
    workStyle: "Hybrid",
    employmentType: "Full-time",
    experience: "4–7 years",
    postedDate: "2026-09-08",
    closingDate: "",
    industries: ["Education"],
    technologies: ["React", "Next.js", "TypeScript", "Node.js or .NET", "PostgreSQL", "REST APIs", "RBAC", "WCAG"],
    description: [
      "The Education Platform Full Stack Engineer will develop web applications and workflow capabilities used by learners, staff and education administrators.",
      "The role requires strong attention to accessibility, role-based access, secure data handling, usability and maintainable application architecture."
    ],
    responsibilities: [
      "Build responsive, accessible user interfaces and backend APIs for education workflows.",
      "Implement role-based access, validation, audit-friendly workflows and secure data handling.",
      "Integrate application services with data, document and communication systems.",
      "Develop automated tests and contribute to code review, CI/CD and release readiness.",
      "Work with analysts and education stakeholders to translate service journeys into maintainable software."
    ],
    qualifications: [
      "4–7 years of full-stack web-development experience.",
      "Strong React/TypeScript experience plus backend development using Node.js, .NET or equivalent.",
      "Experience with relational databases, REST APIs and secure application-development practices.",
      "Understanding of responsive design and web accessibility."
    ],
    preferredQualifications: [
      "Experience with Next.js, PostgreSQL, RBAC and audit logging.",
      "Education, public-sector or workflow-platform experience.",
      "Familiarity with WCAG and privacy-aware product design."
    ],
    benefits: STANDARD_EMPLOYMENT_TERMS,
    workingStyle: [
      "The role works closely with product, education-domain, design and engineering stakeholders.",
      "Accessibility, privacy and role separation are treated as engineering requirements rather than post-release additions."
    ],
    locationDetails: "London-based hybrid role with stakeholder workshops as required."
  }
];

export function getPublishedJobs() {
  return CAREER_JOBS.filter((job) => job.status === "published");
}

export function getPublishedJob(slug = "") {
  return getPublishedJobs().find((job) => job.slug === slug) || null;
}
