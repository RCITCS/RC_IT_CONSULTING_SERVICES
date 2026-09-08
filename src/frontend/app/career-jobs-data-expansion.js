const STANDARD_EMPLOYMENT_TERMS = [
  "Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.",
  "Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."
];

export const ADDITIONAL_DATA_JOBS = [
  {
    slug: "data-engineer",
    jobCode: "RC-DATA-003",
    title: "Data Engineer",
    department: "Data & Analytics",
    status: "published",
    summary: "Build production-grade ingestion, transformation and orchestration pipelines that make enterprise data reliable and usable across reporting, analytics and operational workflows.",
    location: "London, UK",
    workStyle: "Hybrid",
    employmentType: "Full-time",
    experience: "3–5 years",
    postedDate: "2026-09-08",
    closingDate: "",
    industries: ["Banking & Finance", "Education", "Media", "Professional Services"],
    technologies: ["Python", "SQL", "PySpark", "Azure Data Factory", "Databricks", "dbt", "Airflow", "Git"],
    description: [
      "The Data Engineer will develop and support reusable data pipelines, transformation logic and quality controls for cloud and enterprise data platforms.",
      "The role requires practical engineering discipline around observability, recoverability, performance, schema change and deployment rather than one-off data movement."
    ],
    responsibilities: [
      "Develop batch and incremental ingestion pipelines from databases, APIs, files and event sources.",
      "Build transformation models, data-quality checks, orchestration and failure-recovery logic.",
      "Optimise SQL, Spark and pipeline workloads for performance and cost.",
      "Work with analysts and engineers to define source-to-target mappings, data contracts and ownership.",
      "Contribute to CI/CD, code review, monitoring and production support for data workloads."
    ],
    qualifications: [
      "3–5 years of professional data-engineering, ETL/ELT or closely related software-engineering experience.",
      "Strong SQL and working Python skills.",
      "Hands-on experience with at least one cloud data platform or distributed processing framework.",
      "Understanding of dimensional modelling, data quality, orchestration and version control."
    ],
    preferredQualifications: [
      "Experience with Databricks, Microsoft Fabric, dbt, Airflow or equivalent tooling.",
      "Exposure to streaming, data observability or governance platforms.",
      "Experience supporting production data pipelines in multi-system environments."
    ],
    benefits: STANDARD_EMPLOYMENT_TERMS,
    workingStyle: [
      "Engineers work in cross-functional data teams with peer review and defined production ownership.",
      "Hybrid collaboration is expected for design reviews, stakeholder workshops and delivery planning."
    ],
    locationDetails: "London-based hybrid role with occasional UK client-site activity depending on the engagement."
  },
  {
    slug: "lead-data-engineer",
    jobCode: "RC-DATA-004",
    title: "Lead Data Engineer",
    department: "Data & Analytics",
    status: "published",
    summary: "Lead the architecture and engineering of enterprise data platforms, establishing technical standards, delivery patterns and production ownership across complex data programmes.",
    location: "London, UK",
    workStyle: "Hybrid / client-aligned",
    employmentType: "Full-time",
    experience: "9–12 years",
    postedDate: "2026-09-08",
    closingDate: "",
    industries: ["Banking & Finance", "Automotive", "Media", "Education"],
    technologies: ["Python", "SQL", "Spark", "Databricks", "Microsoft Fabric", "Snowflake", "Kafka", "Terraform", "Azure/AWS"],
    description: [
      "The Lead Data Engineer will own technical direction across data ingestion, transformation, storage, integration, governance and operational reliability.",
      "The role combines hands-on architecture with engineering leadership, design review, stakeholder communication and delivery assurance across multiple workstreams."
    ],
    responsibilities: [
      "Define data-platform architecture, engineering standards and reusable delivery patterns.",
      "Lead design reviews covering scalability, security, lineage, observability, resilience and cost.",
      "Guide engineers on implementation, code quality, testing and production support practices.",
      "Coordinate with solution architects, security, application and analytics teams on cross-platform dependencies.",
      "Own technical risk, migration sequencing and operational-readiness decisions for major data releases."
    ],
    qualifications: [
      "9–12 years of data-engineering or enterprise software-engineering experience, including technical leadership.",
      "Deep SQL and strong Python/Spark capability with production-scale platform experience.",
      "Experience architecting modern cloud data platforms and distributed data-processing solutions.",
      "Strong knowledge of data modelling, governance, security, lineage and operational support.",
      "Ability to lead technical decisions with senior engineering and business stakeholders."
    ],
    preferredQualifications: [
      "Experience with Databricks, Microsoft Fabric, Snowflake, Kafka or equivalent enterprise platforms.",
      "Experience in regulated or high-volume environments.",
      "Cloud architecture or data-platform certification where relevant."
    ],
    benefits: STANDARD_EMPLOYMENT_TERMS,
    workingStyle: [
      "This is a senior client-facing engineering role with responsibility for architecture quality and team technical direction.",
      "The role combines design leadership with hands-on review and delivery governance."
    ],
    locationDetails: "London-based with UK client-site workshops and architecture sessions where required."
  },
  {
    slug: "data-analyst",
    jobCode: "RC-DATA-005",
    title: "Data Analyst",
    department: "Data & Analytics",
    status: "published",
    summary: "Turn operational and business data into clear analysis, reliable metrics and decision-ready reporting for client and internal stakeholders.",
    location: "London, UK",
    workStyle: "Hybrid",
    employmentType: "Full-time",
    experience: "3–5 years",
    postedDate: "2026-09-08",
    closingDate: "",
    industries: ["Banking & Finance", "Education", "Professional Services", "Media"],
    technologies: ["SQL", "Power BI", "Excel", "Python", "DAX", "Tableau", "Microsoft Fabric"],
    description: [
      "The Data Analyst will investigate business questions, validate source data, define measures and communicate findings through concise analysis and visual reporting.",
      "The role requires strong numerical reasoning and the ability to explain assumptions, limitations and business implications clearly."
    ],
    responsibilities: [
      "Analyse operational, customer, financial or service data to answer defined business questions.",
      "Develop SQL queries, reusable datasets, dashboards and recurring analytical reports.",
      "Validate data quality, reconcile conflicting metrics and document business definitions.",
      "Work with stakeholders to translate ambiguous questions into measurable analytical requirements.",
      "Present findings, trends and exceptions with clear supporting evidence."
    ],
    qualifications: [
      "3–5 years of professional data-analysis, BI or reporting experience.",
      "Strong SQL and Excel skills with practical dashboarding experience.",
      "Ability to interpret data, identify anomalies and communicate findings to non-technical audiences.",
      "Understanding of data quality, KPI definition and basic statistical concepts."
    ],
    preferredQualifications: [
      "Power BI, Tableau or comparable visualisation experience.",
      "Python or R for analysis and automation.",
      "Experience working with financial, education or operational datasets."
    ],
    benefits: STANDARD_EMPLOYMENT_TERMS,
    workingStyle: [
      "Analysts work closely with business stakeholders and data engineers to keep analysis grounded in reliable data definitions.",
      "Hybrid attendance supports workshops, reporting reviews and stakeholder presentations."
    ],
    locationDetails: "London-based hybrid role with occasional client workshops."
  },
  {
    slug: "senior-data-analyst",
    jobCode: "RC-DATA-006",
    title: "Senior Data Analyst",
    department: "Data & Analytics",
    status: "published",
    summary: "Lead complex analysis, KPI design and executive reporting while improving analytical standards, metric governance and stakeholder decision support.",
    location: "London, UK",
    workStyle: "Hybrid / client-aligned",
    employmentType: "Full-time",
    experience: "5–8 years",
    postedDate: "2026-09-08",
    closingDate: "",
    industries: ["Banking & Finance", "Automotive", "Education", "Professional Services"],
    technologies: ["SQL", "Power BI", "DAX", "Python", "Tableau", "Microsoft Fabric", "dbt"],
    description: [
      "The Senior Data Analyst will own analytical workstreams that require deeper investigation, cross-source reconciliation and management-level communication.",
      "The role also supports metric governance, analytical quality and mentoring of less experienced analysts."
    ],
    responsibilities: [
      "Lead complex analytical investigations across multiple systems and business domains.",
      "Define KPIs, calculation logic, thresholds and reporting standards with accountable business owners.",
      "Develop and review dashboards, analytical models and executive-level reporting packs.",
      "Partner with data engineering teams to improve source quality and analytical data structures.",
      "Mentor analysts and establish reusable analytical methods and documentation standards."
    ],
    qualifications: [
      "5–8 years of professional analytics, BI or decision-support experience.",
      "Advanced SQL and strong Power BI/Tableau experience.",
      "Demonstrated ability to lead stakeholder analysis and explain complex findings clearly.",
      "Strong understanding of metric governance, data quality and analytical validation."
    ],
    preferredQualifications: [
      "Python, statistical modelling or experimentation experience.",
      "Exposure to Microsoft Fabric, dbt or modern analytics-engineering practices.",
      "Experience in regulated or multi-business-unit organisations."
    ],
    benefits: STANDARD_EMPLOYMENT_TERMS,
    workingStyle: [
      "This role combines hands-on analysis with stakeholder leadership and review responsibilities.",
      "Candidates should be comfortable challenging metric definitions and presenting evidence to senior stakeholders."
    ],
    locationDetails: "London-based hybrid role with client-facing analytical workshops where required."
  },
  {
    slug: "data-scientist",
    jobCode: "RC-DATA-007",
    title: "Data Scientist",
    department: "Data Science & AI",
    status: "published",
    summary: "Develop statistical and machine-learning solutions that are evaluated against measurable business outcomes and integrated into controlled production workflows.",
    location: "London, UK",
    workStyle: "Hybrid",
    employmentType: "Full-time",
    experience: "3–6 years",
    postedDate: "2026-09-08",
    closingDate: "",
    industries: ["Banking & Finance", "Automotive", "Media", "Education"],
    technologies: ["Python", "Pandas", "scikit-learn", "SQL", "Jupyter", "MLflow", "Databricks", "Azure ML"],
    description: [
      "The Data Scientist will develop predictive, classification, forecasting and optimisation solutions using governed enterprise data.",
      "The role includes problem framing, feature development, evaluation, explainability and collaboration with engineers to move successful models into production."
    ],
    responsibilities: [
      "Translate business problems into testable analytical and machine-learning hypotheses.",
      "Prepare data, engineer features and build reproducible modelling pipelines.",
      "Select appropriate evaluation metrics and compare model performance against practical baselines.",
      "Document assumptions, limitations, bias considerations and model behaviour.",
      "Work with data and platform engineers on deployment, monitoring and model lifecycle controls."
    ],
    qualifications: [
      "3–6 years of professional data-science, machine-learning or advanced analytics experience.",
      "Strong Python, SQL and statistical modelling skills.",
      "Hands-on experience with supervised and unsupervised machine-learning techniques.",
      "Understanding of model evaluation, feature engineering and reproducible experimentation."
    ],
    preferredQualifications: [
      "Experience with MLflow, Databricks, Azure ML or comparable MLOps tooling.",
      "Time-series, NLP or optimisation experience.",
      "Experience deploying models into business or digital-product workflows."
    ],
    benefits: STANDARD_EMPLOYMENT_TERMS,
    workingStyle: [
      "Data scientists work with business owners, analysts, data engineers and application teams throughout the model lifecycle.",
      "Model quality and business usefulness are reviewed together rather than treating offline accuracy as the only success measure."
    ],
    locationDetails: "London-based hybrid role with project-specific client collaboration."
  },
  {
    slug: "senior-data-scientist",
    jobCode: "RC-DATA-008",
    title: "Senior Data Scientist",
    department: "Data Science & AI",
    status: "published",
    summary: "Lead advanced analytics and machine-learning workstreams from problem framing through evaluation, production integration and model governance.",
    location: "London, UK",
    workStyle: "Hybrid / client-aligned",
    employmentType: "Full-time",
    experience: "6–10 years",
    postedDate: "2026-09-08",
    closingDate: "",
    industries: ["Banking & Finance", "Automotive", "Media", "Professional Services"],
    technologies: ["Python", "scikit-learn", "XGBoost", "PyTorch", "SQL", "MLflow", "Databricks", "Azure/AWS ML"],
    description: [
      "The Senior Data Scientist will lead technically demanding modelling initiatives and establish rigorous evaluation, governance and handover practices.",
      "The role requires the ability to connect statistical methods and machine learning to business decisions, production constraints and accountable operating processes."
    ],
    responsibilities: [
      "Lead model design, feature strategy, experimentation and evaluation for complex use cases.",
      "Set standards for reproducibility, explainability, monitoring and model-risk documentation.",
      "Review analytical methods and mentor data scientists and analysts.",
      "Partner with engineering teams on deployment architecture, serving patterns and operational controls.",
      "Communicate model trade-offs, uncertainty and business implications to senior stakeholders."
    ],
    qualifications: [
      "6–10 years of professional data-science, machine-learning or advanced statistical-modelling experience.",
      "Advanced Python and strong statistical foundations.",
      "Experience leading end-to-end model development from discovery through productionisation.",
      "Strong understanding of evaluation design, model monitoring and governance."
    ],
    preferredQualifications: [
      "Experience with deep learning, NLP, forecasting or optimisation in production.",
      "MLOps experience using MLflow, Databricks, Azure ML, SageMaker or equivalent.",
      "Experience in regulated or decision-critical use cases."
    ],
    benefits: STANDARD_EMPLOYMENT_TERMS,
    workingStyle: [
      "The role combines hands-on modelling with technical leadership, review and stakeholder engagement.",
      "Senior data scientists are expected to make uncertainty, assumptions and model limitations explicit."
    ],
    locationDetails: "London-based hybrid role with client-facing workshops and technical reviews as required."
  },
  {
    slug: "database-designer-data-modeler",
    jobCode: "RC-DB-001",
    title: "Database Designer / Data Modeler",
    department: "Data Architecture",
    status: "published",
    summary: "Design logical and physical data models that support reliable applications, analytics, integration and long-term maintainability across enterprise systems.",
    location: "London, UK",
    workStyle: "Hybrid",
    employmentType: "Full-time",
    experience: "4–7 years",
    postedDate: "2026-09-08",
    closingDate: "",
    industries: ["Banking & Finance", "Education", "Automotive", "Professional Services"],
    technologies: ["SQL Server", "PostgreSQL", "Oracle", "ER/Studio", "ERwin", "dbdiagram", "SQL", "Data Vault", "Dimensional Modelling"],
    description: [
      "The Database Designer / Data Modeler will translate business concepts and system requirements into coherent conceptual, logical and physical data models.",
      "The role supports both transactional and analytical workloads and requires careful attention to integrity, naming, ownership, lifecycle and integration."
    ],
    responsibilities: [
      "Develop conceptual, logical and physical data models for new and modernised systems.",
      "Define entities, relationships, keys, constraints, reference data and naming standards.",
      "Review application and integration designs for data consistency and duplication risk.",
      "Support schema evolution, migration mapping and model version control.",
      "Maintain data dictionaries and modelling documentation aligned with business definitions."
    ],
    qualifications: [
      "4–7 years of professional database design, data modelling or data architecture experience.",
      "Strong relational modelling and SQL knowledge.",
      "Experience with at least one major relational database platform.",
      "Understanding of normalisation, dimensional modelling and data-integrity principles."
    ],
    preferredQualifications: [
      "Experience with ERwin, ER/Studio or comparable modelling tools.",
      "Exposure to Data Vault, canonical models or enterprise integration patterns.",
      "Experience supporting cloud database migration or modernisation."
    ],
    benefits: STANDARD_EMPLOYMENT_TERMS,
    workingStyle: [
      "The role works closely with business analysts, application architects, data engineers and database administrators.",
      "Model changes are reviewed for downstream impact before implementation."
    ],
    locationDetails: "London-based hybrid role with architecture and design workshops as required."
  },
  {
    slug: "senior-database-architect",
    jobCode: "RC-DB-002",
    title: "Senior Database Architect",
    department: "Data Architecture",
    status: "published",
    summary: "Define enterprise database architecture, modelling standards, migration strategy and non-functional design for high-value transactional and analytical systems.",
    location: "London, UK",
    workStyle: "Hybrid / client-aligned",
    employmentType: "Full-time",
    experience: "8–12 years",
    postedDate: "2026-09-08",
    closingDate: "",
    industries: ["Banking & Finance", "Automotive", "Education", "Professional Services"],
    technologies: ["PostgreSQL", "SQL Server", "Oracle", "Azure SQL", "AWS RDS", "Snowflake", "Data Modelling", "HA/DR", "Performance Tuning"],
    description: [
      "The Senior Database Architect will own database and data-store architecture across programmes that require strong integrity, availability, performance, security and migration control.",
      "The role balances application requirements with operational concerns such as backup, recovery, replication, lifecycle, cost and supportability."
    ],
    responsibilities: [
      "Define database architecture and standards across transactional and analytical workloads.",
      "Review physical data models, indexing, partitioning, concurrency, security and performance design.",
      "Lead database migration, consolidation and refactoring strategies with rollback and validation planning.",
      "Establish HA/DR, backup, recovery, monitoring and capacity requirements.",
      "Guide engineering teams on database technology selection and production-readiness decisions."
    ],
    qualifications: [
      "8–12 years of database engineering, database architecture or data-platform experience.",
      "Deep knowledge of relational database architecture, SQL and performance engineering.",
      "Experience designing high-availability, resilient and secure database platforms.",
      "Strong understanding of migration, replication, recovery and operational support."
    ],
    preferredQualifications: [
      "Experience with PostgreSQL, SQL Server, Oracle and managed cloud database services.",
      "Exposure to distributed SQL, Snowflake or analytical data platforms.",
      "Experience in regulated or high-availability enterprise environments."
    ],
    benefits: STANDARD_EMPLOYMENT_TERMS,
    workingStyle: [
      "This is a senior architecture role working across application, platform, data and operations teams.",
      "The architect is expected to document decisions, challenge unsafe assumptions and lead technical reviews."
    ],
    locationDetails: "London-based with UK client-site architecture workshops where required."
  },
  {
    slug: "analytics-engineer",
    jobCode: "RC-DATA-009",
    title: "Analytics Engineer",
    department: "Data & Analytics",
    status: "published",
    summary: "Build tested, documented analytical data models and semantic layers that bridge data engineering and business intelligence teams.",
    location: "London, UK",
    workStyle: "Hybrid",
    employmentType: "Full-time",
    experience: "3–6 years",
    postedDate: "2026-09-08",
    closingDate: "",
    industries: ["Banking & Finance", "Education", "Media", "Professional Services"],
    technologies: ["SQL", "dbt", "Snowflake", "Databricks", "Microsoft Fabric", "Power BI", "Git", "CI/CD"],
    description: [
      "The Analytics Engineer will transform raw platform data into governed, reusable analytical models for reporting, self-service analytics and data products.",
      "The role emphasises software-engineering practices in analytics: testing, documentation, version control, modularity and controlled deployment."
    ],
    responsibilities: [
      "Develop modular SQL/dbt models and reusable business logic.",
      "Implement tests, documentation, lineage and CI checks for analytical transformations.",
      "Partner with BI teams on semantic models and metric definitions.",
      "Optimise warehouse queries and model structures for performance and maintainability.",
      "Support release management and production troubleshooting for analytical datasets."
    ],
    qualifications: [
      "3–6 years of analytics engineering, BI engineering or data-development experience.",
      "Advanced SQL and hands-on dbt or comparable transformation-framework experience.",
      "Understanding of dimensional modelling, testing and source-control practices.",
      "Experience working with a modern cloud warehouse or lakehouse."
    ],
    preferredQualifications: [
      "Snowflake, Databricks or Microsoft Fabric experience.",
      "Power BI semantic modelling experience.",
      "Exposure to data observability and metadata platforms."
    ],
    benefits: STANDARD_EMPLOYMENT_TERMS,
    workingStyle: [
      "Analytics engineers work closely with data engineers, analysts and BI developers to keep business logic reusable and governed.",
      "Changes follow code review and controlled release practices."
    ],
    locationDetails: "London-based hybrid role."
  },
  {
    slug: "data-platform-architect",
    jobCode: "RC-DATA-010",
    title: "Data Platform Architect",
    department: "Data Architecture",
    status: "published",
    summary: "Define target-state data-platform architecture across ingestion, storage, processing, governance, analytics and AI workloads for enterprise transformation programmes.",
    location: "London, UK",
    workStyle: "Hybrid / client-aligned",
    employmentType: "Full-time",
    experience: "9–12 years",
    postedDate: "2026-09-08",
    closingDate: "",
    industries: ["Banking & Finance", "Automotive", "Media", "Education"],
    technologies: ["Azure", "AWS", "Databricks", "Microsoft Fabric", "Snowflake", "Kafka", "dbt", "Terraform", "Data Governance"],
    description: [
      "The Data Platform Architect will define scalable platform architecture and transition roadmaps for enterprise data, analytics and AI workloads.",
      "The role requires broad knowledge across data engineering, cloud, security, governance, integration and operating-model design."
    ],
    responsibilities: [
      "Define current-state assessment, target architecture and staged transition roadmap for data platforms.",
      "Select platform patterns based on workload, latency, security, governance, resilience and cost requirements.",
      "Design ingestion, storage, processing, metadata, lineage and access-control architecture.",
      "Lead architecture governance across engineering teams and suppliers.",
      "Support platform operating-model, ownership, FinOps and production-readiness decisions."
    ],
    qualifications: [
      "9–12 years of data-engineering, data-platform or solution-architecture experience.",
      "Proven experience designing enterprise cloud data platforms.",
      "Strong understanding of distributed data processing, security, governance, integration and analytics architecture.",
      "Ability to communicate architecture decisions to senior technical and business stakeholders."
    ],
    preferredQualifications: [
      "Experience with Databricks, Microsoft Fabric, Snowflake, Kafka or equivalent enterprise platforms.",
      "Cloud and data architecture certifications where relevant.",
      "Experience defining migration roadmaps for legacy warehouse or data-platform estates."
    ],
    benefits: STANDARD_EMPLOYMENT_TERMS,
    workingStyle: [
      "This is a senior client-facing architecture role spanning discovery, target-state design and delivery governance.",
      "Architects are expected to keep trade-offs, dependencies and risks explicit throughout the programme."
    ],
    locationDetails: "London-based with UK client-site architecture workshops where required."
  }
];
