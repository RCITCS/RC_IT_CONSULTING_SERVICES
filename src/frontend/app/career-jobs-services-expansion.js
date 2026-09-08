const STANDARD_EMPLOYMENT_TERMS = [
  "Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.",
  "Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."
];

const DEFAULT_STYLE = [
  "Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.",
  "Hybrid or client-site attendance varies by engagement and is confirmed before assignment."
];

function job({
  slug, jobCode, title, department, summary, experience, technologies = [], industries = [], description = [], responsibilities = [], qualifications = [], preferredQualifications = [], location = "London, UK", workStyle = "Hybrid / client-aligned", locationDetails = "London-based with UK client-site collaboration where required.", workingStyle = DEFAULT_STYLE
}) {
  return {
    slug, jobCode, title, department, status: "published", summary, location, workStyle,
    employmentType: "Full-time", experience, postedDate: "2026-09-08", closingDate: "",
    industries, technologies, description, responsibilities, qualifications, preferredQualifications,
    benefits: STANDARD_EMPLOYMENT_TERMS, workingStyle, locationDetails
  };
}

export const SERVICE_AND_INDUSTRY_JOBS = [
  job({
    slug:"business-analyst", jobCode:"RC-CONS-002", title:"Business Analyst", department:"Technology Consulting", experience:"3–5 years",
    summary:"Translate business needs into clear process, functional, data and technology requirements that delivery teams can implement and stakeholders can validate.",
    technologies:["Jira","Confluence","BPMN","UML","SQL","REST APIs","Process Mapping","Agile Delivery"], industries:["Banking & Finance","Education","Automotive","Professional Services"],
    description:["The Business Analyst will support discovery, requirements definition, process improvement and delivery validation across digital and technology programmes."],
    responsibilities:["Facilitate stakeholder workshops and document current-state and target-state processes.","Define functional and non-functional requirements with measurable acceptance criteria.","Support data mapping, integration and workflow discussions with engineering teams.","Maintain assumptions, decisions, dependencies and requirements traceability.","Support testing, business validation and implementation readiness."],
    qualifications:["3–5 years of business-analysis experience in technology or digital-delivery environments.","Strong requirements, process-mapping and stakeholder communication skills.","Understanding of software delivery, APIs, data flows and system integration."],
    preferredQualifications:["SQL or data-analysis capability.","Experience with BPMN/UML, Jira and Confluence.","Industry experience aligned to RC client sectors."]
  }),
  job({
    slug:"senior-business-analyst", jobCode:"RC-CONS-003", title:"Senior Business Analyst", department:"Technology Consulting", experience:"6–10 years",
    summary:"Lead complex discovery and requirements workstreams across multi-system transformation programmes, connecting business outcomes to technology delivery and operating change.",
    technologies:["Jira","Confluence","BPMN","UML","SQL","APIs","Data Mapping","Agile / Hybrid Delivery"], industries:["Banking & Finance","Education","Automotive","Professional Services"],
    description:["The Senior Business Analyst will lead stakeholder discovery, scope definition and cross-functional analysis where processes, data and systems span multiple teams."],
    responsibilities:["Lead discovery workshops and resolve conflicting stakeholder requirements.","Define target-state processes, business rules, data requirements and integration impacts.","Coach analysts and review requirement quality and traceability.","Support programme scope, risk, dependency and change-control decisions.","Work with architects and delivery leads to keep business intent visible through implementation."],
    qualifications:["6–10 years of business-analysis experience, including complex enterprise programmes.","Strong facilitation, process modelling, requirements governance and stakeholder-management capability.","Good understanding of integration, data and software-delivery lifecycles."],
    preferredQualifications:["Experience in regulated or multi-supplier programmes.","Relevant BA or delivery certification where applicable.","Experience mentoring analysts."]
  }),
  job({
    slug:"qa-engineer", jobCode:"RC-QE-002", title:"QA Engineer", department:"Quality Engineering", experience:"3–5 years",
    summary:"Validate web applications, APIs and business workflows through structured functional, integration and regression testing with clear defect evidence.",
    technologies:["Postman","REST APIs","SQL","Playwright","Selenium","Jira","Test Management","CI/CD"], industries:["Banking & Finance","Education","Media","Automotive"],
    description:["The QA Engineer will design and execute risk-based test coverage and work closely with analysts and developers to improve release quality."],
    responsibilities:["Create test scenarios from requirements and business risk.","Execute functional, regression, API and integration testing.","Document defects with reproducible evidence and business impact.","Support test-data preparation and environment validation.","Contribute to release-readiness and quality reporting."],
    qualifications:["3–5 years of software testing or quality-assurance experience.","Strong understanding of functional, regression and API testing.","Working SQL knowledge and ability to analyse defects across system boundaries."],
    preferredQualifications:["Automation exposure using Playwright, Selenium or Cypress.","Experience with Agile delivery and CI/CD.","Accessibility or performance-testing exposure."]
  }),
  job({
    slug:"senior-qa-automation-engineer", jobCode:"RC-QE-003", title:"Senior QA Automation Engineer", department:"Quality Engineering", experience:"5–9 years",
    summary:"Lead automated quality engineering across UI, API and integration layers, establishing reusable test architecture and faster release feedback.",
    technologies:["Playwright","Selenium","Cypress","TypeScript","Java","Postman","JMeter","CI/CD"], industries:["Banking & Finance","Education","Media","Automotive"],
    description:["The Senior QA Automation Engineer will design automation frameworks, mentor testers and integrate quality evidence into delivery pipelines."],
    responsibilities:["Design maintainable UI, API and integration automation frameworks.","Integrate automated suites with CI/CD and release gates.","Review test strategy, coverage and flaky-test root causes.","Support performance, accessibility and non-functional testing where required.","Coach QA engineers and collaborate with developers on testability."],
    qualifications:["5–9 years of QA or quality-engineering experience with strong automation depth.","Hands-on experience with modern UI and API automation frameworks.","Strong coding, debugging and CI/CD skills."],
    preferredQualifications:["TypeScript/Java automation experience.","Performance-testing experience using JMeter, k6 or equivalent.","Experience defining test architecture for enterprise applications."]
  }),
  job({
    slug:"data-warehouse-engineer", jobCode:"RC-DATA-011", title:"Data Warehouse Engineer", department:"Data & Analytics", experience:"4–7 years",
    summary:"Design and build governed analytical warehouse structures, ETL/ELT pipelines and dimensional models for reliable enterprise reporting and analytics.",
    technologies:["SQL","Snowflake","Microsoft Fabric","Azure Synapse","Databricks","dbt","SSIS","Power BI"], industries:["Banking & Finance","Education","Media","Professional Services"],
    description:["The Data Warehouse Engineer will develop warehouse schemas, transformation pipelines and performance controls for enterprise analytical workloads."],
    responsibilities:["Design fact and dimension models aligned to reporting requirements.","Build ETL/ELT pipelines, history handling and data-quality controls.","Optimise warehouse queries, storage and refresh performance.","Document lineage, source-to-target mappings and business definitions.","Support release, monitoring and production issue resolution."],
    qualifications:["4–7 years of data-warehouse, ETL/ELT or analytics-engineering experience.","Strong SQL and dimensional-modelling capability.","Hands-on experience with at least one modern warehouse or lakehouse platform."],
    preferredQualifications:["Snowflake, Fabric, Synapse or Databricks experience.","dbt or SSIS experience.","Experience with enterprise BI and governed semantic models."]
  }),
  job({
    slug:"senior-data-warehouse-engineer", jobCode:"RC-DATA-012", title:"Senior Data Warehouse Engineer", department:"Data & Analytics", experience:"7–10 years",
    summary:"Lead warehouse architecture, dimensional modelling and migration workstreams for enterprise reporting platforms with strong performance, governance and operational controls.",
    technologies:["Snowflake","Microsoft Fabric","Azure Synapse","Databricks","SQL","dbt","SSIS","Data Vault"], industries:["Banking & Finance","Automotive","Education","Professional Services"],
    description:["The Senior Data Warehouse Engineer will own design quality across warehouse, lakehouse and semantic-layer workstreams and support migration from legacy analytical platforms."],
    responsibilities:["Lead target data-model and warehouse architecture decisions.","Review ETL/ELT design, history management, reconciliation and performance.","Plan legacy warehouse migration and cutover with validation and rollback controls.","Mentor engineers and establish modelling and testing standards.","Coordinate with BI, governance and platform teams on release and support."],
    qualifications:["7–10 years of data-warehouse or analytics-platform engineering experience.","Advanced SQL, dimensional modelling and warehouse performance expertise.","Experience leading enterprise data migrations or modernisation programmes."],
    preferredQualifications:["Data Vault, Snowflake, Fabric, Synapse or Databricks experience.","Strong data-governance and lineage knowledge.","Experience in regulated environments."]
  }),
  job({
    slug:"etl-developer", jobCode:"RC-DATA-013", title:"ETL / ELT Developer", department:"Data & Analytics", experience:"3–6 years",
    summary:"Develop reliable data-integration workflows across source systems, warehouses and cloud data platforms with automated validation and recoverability.",
    technologies:["SQL","SSIS","Azure Data Factory","dbt","Python","Airflow","Databricks"], industries:["Banking & Finance","Education","Media","Professional Services"],
    description:["The ETL / ELT Developer will implement ingestion and transformation workflows and support data-quality and production-monitoring requirements."],
    responsibilities:["Build scheduled and incremental data pipelines.","Implement source-to-target transformations and validation rules.","Handle failures, retries, logging and operational alerts.","Optimise SQL and pipeline performance.","Support deployment and production troubleshooting."],
    qualifications:["3–6 years of ETL/ELT or data-integration development experience.","Strong SQL and hands-on experience with at least one orchestration or ETL platform.","Understanding of data quality, scheduling and production support."],
    preferredQualifications:["ADF, SSIS, dbt, Airflow or Databricks experience.","Python scripting capability.","Cloud data-platform exposure."]
  }),
  job({
    slug:"soc-analyst", jobCode:"RC-SEC-002", title:"SOC Analyst", department:"Cyber Security", experience:"3–5 years",
    summary:"Monitor, investigate and escalate security events using SIEM, endpoint and cloud telemetry within authorised defensive-security operations.",
    technologies:["SIEM","Microsoft Sentinel","Splunk","EDR","Microsoft Defender","IAM","Log Analysis","Incident Response"], industries:["Banking & Finance","Education","Professional Services"],
    description:["The SOC Analyst will triage alerts, investigate suspicious activity and maintain evidence and escalation quality across defensive-security operations."],
    responsibilities:["Monitor and triage security alerts from SIEM, EDR and cloud platforms.","Investigate events using logs, identity and endpoint evidence.","Escalate incidents using defined severity and response procedures.","Maintain investigation notes, indicators and case evidence.","Contribute to detection tuning and playbook improvement."],
    qualifications:["3–5 years of SOC, security-operations or cyber-monitoring experience.","Practical SIEM and log-analysis experience.","Good understanding of identity, endpoint, network and cloud security concepts."],
    preferredQualifications:["Microsoft Sentinel, Splunk or Defender experience.","Incident-response or threat-hunting exposure.","Relevant security certification or equivalent experience."]
  }),
  job({
    slug:"senior-cyber-security-analyst", jobCode:"RC-SEC-003", title:"Senior Cyber Security Analyst", department:"Cyber Security", experience:"5–8 years",
    summary:"Lead security investigations, control assessments and defensive improvement work across identity, endpoints, cloud and application environments.",
    technologies:["SIEM","EDR","Microsoft Sentinel","Splunk","IAM","Vulnerability Management","Cloud Security","Incident Response"], industries:["Banking & Finance","Education","Professional Services"],
    description:["The Senior Cyber Security Analyst will combine operational security analysis with control review, incident leadership and improvement planning."],
    responsibilities:["Lead complex incident investigation and evidence review.","Assess security-control gaps and prioritise remediation.","Improve detection rules, escalation paths and response playbooks.","Support vulnerability and security-risk reporting.","Mentor analysts and coordinate with engineering teams on defensive improvements."],
    qualifications:["5–8 years of cyber-security or security-operations experience.","Strong SIEM, endpoint, IAM and incident-analysis capability.","Ability to communicate security risk and remediation priorities clearly."],
    preferredQualifications:["Cloud-security and vulnerability-management experience.","Experience in regulated environments.","Relevant security certification or equivalent experience."]
  }),
  job({
    slug:"cloud-security-engineer", jobCode:"RC-SEC-004", title:"Cloud Security Engineer", department:"Cyber Security", experience:"5–9 years",
    summary:"Engineer preventive and detective security controls across cloud identity, networking, workloads, data and delivery pipelines.",
    technologies:["Azure Security","AWS Security","IAM","Terraform","CSPM","SIEM","Kubernetes Security","DevSecOps"], industries:["Banking & Finance","Media","Education","Automotive"],
    description:["The Cloud Security Engineer will work with platform and application teams to embed enforceable cloud security controls into architecture and delivery."],
    responsibilities:["Define cloud security baselines for identity, network, data and workload controls.","Implement or review policy-as-code and infrastructure-security checks.","Support CSPM, vulnerability and cloud logging integration.","Review cloud architecture and threat scenarios.","Partner with DevOps teams on secure pipelines and secrets management."],
    qualifications:["5–9 years of cyber-security, cloud-security or platform-security experience.","Strong Azure or AWS security knowledge.","Practical IAM, networking and infrastructure-as-code experience."],
    preferredQualifications:["Kubernetes/container-security experience.","Terraform and DevSecOps experience.","Cloud-security certification where relevant."]
  }),
  job({
    slug:"technical-customer-support-specialist", jobCode:"RC-SUP-002", title:"Technical Customer Support Specialist", department:"IT Support Services", experience:"3–5 years",
    summary:"Provide structured technical assistance to customers and users across software, account, connectivity and application issues with clear ownership and communication.",
    technologies:["ITSM","CRM","Windows","Microsoft 365","REST/API Basics","SQL Basics","Remote Support","Knowledge Base"], industries:["Education","Professional Services","Media"],
    description:["The Technical Customer Support Specialist will diagnose user issues, provide first-line technical guidance and route complex incidents with useful evidence."],
    responsibilities:["Handle customer technical enquiries by phone, email and approved digital channels.","Troubleshoot account, application, browser, connectivity and configuration issues.","Document incidents accurately and maintain customer communication through resolution.","Escalate issues with logs, screenshots and reproducible evidence.","Contribute to knowledge articles and recurring-issue analysis."],
    qualifications:["3–5 years of technical customer support, helpdesk or service-desk experience.","Strong written and verbal communication skills.","Good understanding of desktop, browser, SaaS and basic network troubleshooting."],
    preferredQualifications:["ITIL or service-management exposure.","Experience with CRM/ITSM platforms.","Basic SQL, API or cloud-service troubleshooting knowledge."]
  }),
  job({
    slug:"technical-call-centre-executive", jobCode:"RC-SUP-003", title:"Call Centre Executive – Technical Support", department:"IT Support Services", experience:"3–5 years",
    summary:"Support customers through high-quality inbound and outbound technical conversations, structured issue capture and clear hand-off to specialist support teams.",
    technologies:["CRM","ITSM","VoIP / Contact Centre","Microsoft 365","Ticketing","Knowledge Base"], industries:["Education","Professional Services","Media"],
    description:["The Call Centre Executive – Technical Support will combine customer-service discipline with practical technical triage and accurate ticket ownership."],
    responsibilities:["Handle inbound and approved outbound customer-support calls professionally.","Capture identity, issue, urgency and environment details accurately.","Resolve supported first-line issues using approved knowledge and troubleshooting procedures.","Create and route tickets with complete notes and follow-up expectations.","Maintain service quality, privacy and communication standards."],
    qualifications:["3–5 years of customer service, call-centre or technical-support experience.","Strong spoken and written English with professional telephone etiquette.","Ability to follow technical troubleshooting and escalation procedures consistently."],
    preferredQualifications:["Technology, SaaS, education or IT-service support experience.","CRM/ITSM and contact-centre platform experience.","Additional language capability relevant to business needs."]
  }),
  job({
    slug:"technical-support-team-lead", jobCode:"RC-SUP-004", title:"Technical Support Team Lead", department:"IT Support Services", experience:"6–9 years",
    summary:"Lead technical support operations, escalation quality, service performance and team development across customer and application-support workflows.",
    technologies:["ITSM","ServiceNow","Jira Service Management","Monitoring","SQL","Incident Management","Problem Management"], industries:["Banking & Finance","Education","Professional Services"],
    description:["The Technical Support Team Lead will coordinate service-desk and application-support activity while driving consistent ownership and continuous improvement."],
    responsibilities:["Manage support queues, priorities, escalations and team workload.","Review incident quality, service metrics and recurring problem patterns.","Coach support staff and maintain knowledge and runbook standards.","Coordinate with engineering and client teams on major incidents and releases.","Drive service-improvement actions to measurable closure."],
    qualifications:["6–9 years of IT support or service-management experience, including team leadership.","Strong incident, escalation and stakeholder-management capability.","Experience with ITSM tooling and operational reporting."],
    preferredQualifications:["ITIL certification or equivalent service-management experience.","Application-support or cloud-support background.","Experience leading client-facing support teams."]
  }),
  job({
    slug:"technical-recruiter", jobCode:"RC-HR-001", title:"Technical Recruiter", department:"Talent Acquisition", experience:"3–6 years",
    summary:"Source, assess and coordinate technology candidates across software, cloud, data, cyber security, QA and support roles with role-specific screening discipline.",
    technologies:["ATS","LinkedIn Recruiter","Job Boards","Interview Coordination","Technical Screening","Recruitment Analytics"], industries:["Technology Consulting","Banking & Finance","Automotive","Education"],
    description:["The Technical Recruiter will manage vacancy intake, sourcing, screening and candidate coordination for approved RC technology positions."],
    responsibilities:["Translate approved role requirements into sourcing and screening criteria.","Source candidates across relevant channels and maintain accurate ATS records.","Conduct structured recruiter screens covering experience, location, availability and role fit.","Coordinate interviews and candidate communication.","Track pipeline quality and recruitment metrics without making unapproved employment promises."],
    qualifications:["3–6 years of technical recruitment or technology staffing experience.","Strong understanding of common software, cloud, data, QA and infrastructure role families.","Professional candidate communication and recruitment-process discipline."],
    preferredQualifications:["Experience recruiting for UK technology roles.","ATS and LinkedIn Recruiter experience.","Experience supporting client-aligned or consulting recruitment."]
  }),
  job({
    slug:"senior-technical-recruiter", jobCode:"RC-HR-002", title:"Senior Technical Recruiter", department:"Talent Acquisition", experience:"6–10 years",
    summary:"Lead complex technology hiring across scarce skill areas, improve recruitment quality and partner with delivery leadership on workforce planning and candidate pipelines.",
    technologies:["ATS","LinkedIn Recruiter","Talent Mapping","Recruitment Analytics","Workforce Planning","Interview Governance"], industries:["Technology Consulting","Banking & Finance","Automotive","Education"],
    description:["The Senior Technical Recruiter will manage priority technical hiring and improve intake, sourcing, assessment and candidate-experience standards."],
    responsibilities:["Lead hiring for senior and specialist technology roles.","Advise hiring managers on realistic skill profiles and market constraints.","Build talent maps and proactive pipelines for recurring capability needs.","Review screening quality, interview flow and candidate communication.","Mentor recruiters and improve recruitment reporting and governance."],
    qualifications:["6–10 years of technology recruitment experience, including senior or specialist hiring.","Strong knowledge of software, cloud, data, cyber security and engineering role markets.","Demonstrated stakeholder-management and recruitment-process leadership."],
    preferredQualifications:["UK consulting or professional-services recruitment experience.","Experience with workforce planning and recruitment analytics.","Team mentoring or recruitment-lead experience."]
  }),
  job({
    slug:"machine-learning-engineer", jobCode:"RC-AI-001", title:"Machine Learning Engineer", department:"Artificial Intelligence", experience:"4–8 years",
    summary:"Build production machine-learning services and pipelines that connect validated models to reliable software, data and operational controls.",
    technologies:["Python","PyTorch","scikit-learn","MLflow","Databricks","Docker","Kubernetes","Azure ML / SageMaker"], industries:["Banking & Finance","Automotive","Media","Education"],
    description:["The Machine Learning Engineer will bridge data science and production engineering by packaging, deploying and operating ML capabilities."],
    responsibilities:["Implement model-training and inference pipelines.","Build APIs, batch or event-driven model-serving integrations.","Automate testing, versioning, deployment and monitoring for ML workloads.","Partner with data scientists on evaluation and reproducibility.","Improve performance, cost, security and production reliability."],
    qualifications:["4–8 years of software, data or machine-learning engineering experience.","Strong Python and practical ML framework experience.","Experience deploying models into production environments."],
    preferredQualifications:["MLflow, Databricks, Azure ML or SageMaker experience.","Docker/Kubernetes and CI/CD experience.","Feature-store, streaming or real-time inference experience."]
  }),
  job({
    slug:"mlops-engineer", jobCode:"RC-AI-002", title:"MLOps Engineer", department:"Artificial Intelligence", experience:"5–9 years",
    summary:"Engineer repeatable model deployment, evaluation, monitoring and lifecycle controls for machine-learning and AI services.",
    technologies:["MLflow","Azure ML","SageMaker","Databricks","Docker","Kubernetes","Terraform","CI/CD","Observability"], industries:["Banking & Finance","Automotive","Media","Professional Services"],
    description:["The MLOps Engineer will establish production controls around model versioning, deployment, monitoring, rollback and infrastructure automation."],
    responsibilities:["Build CI/CD pipelines for model and inference-service releases.","Implement model registry, versioning and environment promotion controls.","Configure monitoring for model quality, drift, latency and infrastructure health.","Automate infrastructure and deployment patterns.","Support rollback, incident response and lifecycle governance."],
    qualifications:["5–9 years of DevOps, platform, data or ML engineering experience with production ML exposure.","Strong cloud, containers, CI/CD and infrastructure-automation capability.","Understanding of model lifecycle, evaluation and operational monitoring."],
    preferredQualifications:["MLflow, Databricks, Azure ML or SageMaker experience.","Kubernetes and Terraform expertise.","Experience supporting regulated AI workloads."]
  }),
  job({
    slug:"cloud-solutions-architect", jobCode:"RC-CLOUD-002", title:"Cloud Solutions Architect", department:"Cloud & Infrastructure", experience:"8–12 years",
    summary:"Define secure, resilient and cost-aware cloud architectures and migration roadmaps across application, data and integration workloads.",
    technologies:["Azure","AWS","GCP","Terraform","Kubernetes","Networking","IAM","Observability","FinOps"], industries:["Banking & Finance","Media","Education","Automotive"],
    description:["The Cloud Solutions Architect will lead current-state assessment, target architecture and implementation governance for cloud transformation programmes."],
    responsibilities:["Define landing-zone, network, identity, security and workload architecture.","Assess migration, replatform and refactor options by workload.","Review resilience, observability, cost and operational-readiness requirements.","Guide platform and application teams through architecture decisions.","Document transition roadmaps, risks and architecture standards."],
    qualifications:["8–12 years of cloud, infrastructure or solution-architecture experience.","Deep knowledge of at least one major cloud platform and enterprise networking/IAM.","Experience leading cloud migration or modernisation programmes."],
    preferredQualifications:["Azure/AWS/GCP architecture certification.","Kubernetes, Terraform and landing-zone experience.","FinOps and SRE knowledge."]
  }),
  job({
    slug:"risk-compliance-analyst", jobCode:"RC-RISK-001", title:"Risk & Compliance Analyst", department:"Risk & Management Consulting", experience:"3–6 years",
    summary:"Support operational and technology risk assessment, control mapping, evidence review and remediation tracking across enterprise environments.",
    technologies:["GRC","Risk Registers","Control Testing","Excel / Power BI","Jira","Policy Mapping","Audit Evidence"], industries:["Banking & Finance","Education","Professional Services"],
    description:["The Risk & Compliance Analyst will help translate policy, control and operational requirements into practical evidence and tracked remediation."],
    responsibilities:["Maintain risk and control registers with accountable owners.","Map controls to operating processes and evidence sources.","Support control testing and remediation follow-up.","Prepare risk reporting and management information.","Coordinate evidence requests across technology and business teams."],
    qualifications:["3–6 years of risk, compliance, audit or controls experience.","Strong documentation, analytical and stakeholder-coordination skills.","Understanding of technology and operational-risk concepts."],
    preferredQualifications:["Financial-services or regulated-environment experience.","GRC platform experience.","Relevant risk, audit or compliance certification."]
  }),
  job({
    slug:"sustainability-consultant", jobCode:"RC-SUST-001", title:"Sustainability Consultant", department:"Sustainability", experience:"4–8 years",
    summary:"Help organisations translate sustainability objectives into measurable roadmaps, data requirements, operating changes and technology-enabled improvement initiatives.",
    technologies:["ESG Reporting","Data Analysis","Power BI","Process Mapping","Programme Delivery","Sustainability Metrics"], industries:["Automotive","Professional Services","Education"],
    description:["The Sustainability Consultant will support strategy, data and change activities that connect sustainability goals to accountable operational delivery."],
    responsibilities:["Assess sustainability priorities, current initiatives and data availability.","Define roadmap, measures, owners and implementation dependencies.","Support sustainability reporting-data design and quality review.","Coordinate change and adoption activities across stakeholders.","Track delivery progress and evidence against agreed outcomes."],
    qualifications:["4–8 years of sustainability, transformation, ESG, operations or management-consulting experience.","Strong analytical and stakeholder-management capability.","Ability to structure measurable initiatives and implementation roadmaps."],
    preferredQualifications:["ESG reporting or sustainability-data experience.","Technology-efficiency or cloud-optimisation exposure.","Relevant sustainability qualification where applicable."]
  }),
  job({
    slug:"education-technology-consultant", jobCode:"RC-EDU-002", title:"Education Technology Consultant", department:"Education Technology", experience:"4–8 years",
    summary:"Advise education organisations on digital service design, student and staff workflows, platform requirements, accessibility and implementation planning.",
    technologies:["Education MIS","CRM","Student Portals","Workflow Platforms","Data Integration","WCAG","Reporting"], industries:["Education"],
    description:["The Education Technology Consultant will combine education-process understanding with technology advisory and delivery planning."],
    responsibilities:["Map learner, staff and administrative journeys.","Define portal, workflow, integration and reporting requirements.","Support solution evaluation and implementation planning.","Address accessibility, privacy and role-based access requirements.","Coordinate stakeholder workshops and adoption activities."],
    qualifications:["4–8 years of education technology, digital transformation or education-consulting experience.","Strong requirements, process and stakeholder-management capability.","Understanding of education systems, data and digital-service delivery."],
    preferredQualifications:["Education MIS, CRM or student-portal experience.","WCAG/accessibility knowledge.","Experience supporting education-sector implementation programmes."]
  }),
  job({
    slug:"automotive-software-engineer", jobCode:"RC-AUTO-002", title:"Automotive Software Engineer", department:"Automotive Technology", experience:"4–8 years",
    summary:"Develop connected-product, integration and backend software for automotive and mobility programmes with strong reliability and observability requirements.",
    technologies:["Java / .NET","REST APIs","Kafka","MQTT","Azure / AWS","SQL","Docker","Observability"], industries:["Automotive"],
    description:["The Automotive Software Engineer will build services and integrations that connect vehicle-related data, digital applications and enterprise platforms."],
    responsibilities:["Develop APIs and backend services for automotive workflows.","Implement event-driven integrations and data contracts.","Build automated tests and production telemetry.","Support integration troubleshooting across multiple system owners.","Document interface ownership and failure-handling behaviour."],
    qualifications:["4–8 years of backend, integration or platform-engineering experience.","Strong Java, .NET or comparable backend development skills.","Experience with APIs, messaging and distributed systems."],
    preferredQualifications:["Automotive, telematics or connected-product experience.","Kafka/MQTT and cloud-platform experience.","High-volume event-processing experience."]
  }),
  job({
    slug:"media-platform-engineer", jobCode:"RC-MEDIA-001", title:"Media Platform Engineer", department:"Media & Communication Technology", experience:"4–8 years",
    summary:"Build and operate scalable digital media, content and communication platforms with reliable integrations, performance and observability.",
    technologies:["Node.js / Java / .NET","APIs","Cloud","CDN","Event Streaming","SQL/NoSQL","Docker","Observability"], industries:["Media"],
    description:["The Media Platform Engineer will support content, audience and distribution workflows across cloud-hosted digital platforms."],
    responsibilities:["Develop backend services and platform integrations for content workflows.","Improve performance, caching, resilience and observability.","Support event-driven integrations and metadata flows.","Automate deployment and production health checks.","Investigate platform failures and recurring operational issues."],
    qualifications:["4–8 years of backend, cloud or platform-engineering experience.","Strong API and distributed-system fundamentals.","Experience operating high-traffic or content-heavy digital services."],
    preferredQualifications:["Media, streaming, publishing or communication-platform experience.","CDN and event-streaming knowledge.","Cloud-native and container-platform experience."]
  })
];
