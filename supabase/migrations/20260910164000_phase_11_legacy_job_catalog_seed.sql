-- Generated from the approved pre-Phase-11 Careers catalog.
-- Do not hand-edit this file; regenerate with scripts/export-phase11-legacy-job-seed.mjs.

do $$
declare
  v_admin_id uuid;
begin
  select id into v_admin_id
  from public.admins
  where status = 'active' and role = 'super_admin'
  order by created_at, id
  limit 1;

  if v_admin_id is null then
    raise exception 'Phase 11 legacy job migration requires one active super_admin';
  end if;

  insert into public.job_categories (slug, name, description, display_order, is_active, updated_at)
  values ('application-engineering', 'Application Engineering', null, 0, true, now())
  on conflict (slug) do nothing;

  insert into public.job_categories (slug, name, description, display_order, is_active, updated_at)
  values ('artificial-intelligence', 'Artificial Intelligence', null, 10, true, now())
  on conflict (slug) do nothing;

  insert into public.job_categories (slug, name, description, display_order, is_active, updated_at)
  values ('automotive-technology', 'Automotive Technology', null, 20, true, now())
  on conflict (slug) do nothing;

  insert into public.job_categories (slug, name, description, display_order, is_active, updated_at)
  values ('cloud-and-infrastructure', 'Cloud & Infrastructure', null, 30, true, now())
  on conflict (slug) do nothing;

  insert into public.job_categories (slug, name, description, display_order, is_active, updated_at)
  values ('cyber-security', 'Cyber Security', null, 40, true, now())
  on conflict (slug) do nothing;

  insert into public.job_categories (slug, name, description, display_order, is_active, updated_at)
  values ('data-and-analytics', 'Data & Analytics', null, 50, true, now())
  on conflict (slug) do nothing;

  insert into public.job_categories (slug, name, description, display_order, is_active, updated_at)
  values ('data-architecture', 'Data Architecture', null, 60, true, now())
  on conflict (slug) do nothing;

  insert into public.job_categories (slug, name, description, display_order, is_active, updated_at)
  values ('data-science-and-ai', 'Data Science & AI', null, 70, true, now())
  on conflict (slug) do nothing;

  insert into public.job_categories (slug, name, description, display_order, is_active, updated_at)
  values ('education-technology', 'Education Technology', null, 80, true, now())
  on conflict (slug) do nothing;

  insert into public.job_categories (slug, name, description, display_order, is_active, updated_at)
  values ('it-support-services', 'IT Support Services', null, 90, true, now())
  on conflict (slug) do nothing;

  insert into public.job_categories (slug, name, description, display_order, is_active, updated_at)
  values ('media-and-communication-technology', 'Media & Communication Technology', null, 100, true, now())
  on conflict (slug) do nothing;

  insert into public.job_categories (slug, name, description, display_order, is_active, updated_at)
  values ('platform-engineering', 'Platform Engineering', null, 110, true, now())
  on conflict (slug) do nothing;

  insert into public.job_categories (slug, name, description, display_order, is_active, updated_at)
  values ('quality-engineering', 'Quality Engineering', null, 120, true, now())
  on conflict (slug) do nothing;

  insert into public.job_categories (slug, name, description, display_order, is_active, updated_at)
  values ('risk-and-management-consulting', 'Risk & Management Consulting', null, 130, true, now())
  on conflict (slug) do nothing;

  insert into public.job_categories (slug, name, description, display_order, is_active, updated_at)
  values ('strategy-and-implementation', 'Strategy & Implementation', null, 140, true, now())
  on conflict (slug) do nothing;

  insert into public.job_categories (slug, name, description, display_order, is_active, updated_at)
  values ('sustainability', 'Sustainability', null, 150, true, now())
  on conflict (slug) do nothing;

  insert into public.job_categories (slug, name, description, display_order, is_active, updated_at)
  values ('talent-acquisition', 'Talent Acquisition', null, 160, true, now())
  on conflict (slug) do nothing;

  insert into public.job_categories (slug, name, description, display_order, is_active, updated_at)
  values ('technology-consulting', 'Technology Consulting', null, 170, true, now())
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-DATA-001', 'senior-data-engineer', 'Senior Data Engineer', 'Design and build dependable data pipelines and analytical platforms for enterprise transformation programmes across multiple industry contexts.', 'The Senior Data Engineer will design, implement and operate data pipelines, transformation layers and analytical data products used by client delivery teams and business stakeholders.

The role requires strong engineering judgement around data quality, lineage, performance, security, orchestration and operational support rather than pipeline development in isolation.',
    'London, UK', 'hybrid', 'full_time', '5–8 years',
    '["Python","SQL","PySpark","Azure Data Factory","Databricks","Microsoft Fabric","dbt","Git"]'::jsonb, '["Banking & Finance","Automotive","Media","Education"]'::jsonb, '["Design batch and streaming ingestion patterns, transformation pipelines and reusable data components.","Build and maintain data models, validation controls, orchestration, monitoring and failure-recovery patterns.","Work with architects, analysts, application teams and client stakeholders to define data contracts and ownership boundaries.","Review code, deployment pipelines and data-quality evidence before production release.","Support production diagnosis and continuous improvement of data-platform reliability and cost."]'::jsonb, '["5–8 years of professional data-engineering or closely related software-engineering experience.","Strong SQL and Python skills with hands-on experience building production ETL/ELT pipelines.","Experience with Spark/PySpark and at least one modern cloud data platform.","Working knowledge of data modelling, data quality, orchestration, version control and CI/CD.","Ability to explain technical trade-offs clearly to engineering and non-engineering stakeholders."]'::jsonb,
    '["Experience with Azure Data Factory, Databricks, Microsoft Fabric, dbt or equivalent platforms.","Experience in regulated, high-volume or multi-system enterprise environments.","Knowledge of data lineage, observability, governance and secure data-access patterns."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around project outcomes, engineering standards, peer review and client delivery commitments.","Hybrid attendance and client-site presence vary by engagement and are confirmed for the assigned project.","Engineers are expected to document decisions, communicate delivery risk early and participate in technical review."]'::jsonb, 'Primary employment location is London. Some engagements may require travel to a UK client location; the requirement will be confirmed before assignment.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'data-and-analytics'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-DATA-002', 'data-bi-engineer', 'Data & BI Engineer', 'Build governed analytical models, reporting datasets and business intelligence solutions that turn operational data into dependable decision support.', 'The Data & BI Engineer will develop reporting datasets, semantic models, dashboards and reusable transformation logic for business and operational reporting.

The role combines hands-on BI development with data-quality, metric-definition and stakeholder collaboration responsibilities.',
    'London, UK', 'hybrid', 'full_time', '3–5 years',
    '["SQL","Power BI","DAX","Microsoft Fabric","dbt","Python","Excel","Git"]'::jsonb, '["Banking & Finance","Education","Professional Services"]'::jsonb, '["Develop reusable SQL transformations, analytical models and reporting datasets.","Create Power BI semantic models, measures and dashboards with consistent metric definitions.","Work with users to translate reporting needs into governed data and visualisation requirements.","Implement data-quality checks, refresh monitoring and release controls for reporting solutions.","Document lineage, definitions, assumptions and known limitations for key business measures."]'::jsonb, '["3–5 years of hands-on experience in BI, analytics engineering or data development.","Strong SQL and practical Power BI/DAX experience.","Understanding of dimensional modelling, data quality and dashboard performance.","Experience working with business stakeholders to define measurable reporting requirements."]'::jsonb,
    '["Exposure to Microsoft Fabric, dbt, Python or cloud data platforms.","Experience supporting finance, education or operational reporting environments."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["The role combines independent analytical development with regular reviews of metric definitions and business context.","Hybrid attendance is expected for collaboration, workshops and project delivery activities."]'::jsonb, 'London-based hybrid role with occasional UK client-site workshops where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'data-and-analytics'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-APP-001', 'senior-dotnet-full-stack-engineer', 'Senior .NET Full Stack Engineer', 'Engineer modern web applications, APIs and integration services using Microsoft technologies and contemporary front-end frameworks.', 'The Senior .NET Full Stack Engineer will design and deliver secure, maintainable web applications and APIs across client and internal technology programmes.

The role requires depth in backend engineering plus practical front-end capability, integration design, testing and production-readiness.',
    'London, UK', 'hybrid', 'full_time', '5–10 years',
    '["C#",".NET 8","ASP.NET Core","REST APIs","React","Angular","TypeScript","SQL Server","Azure"]'::jsonb, '["Banking & Finance","Education","Professional Services"]'::jsonb, '["Design and implement ASP.NET Core services, APIs and application components.","Develop accessible, responsive front-end features using React or Angular and TypeScript.","Design data access, validation, error handling, authentication and integration boundaries.","Contribute to architecture reviews, code reviews, automated testing and CI/CD pipelines.","Diagnose production issues and improve observability, resilience and maintainability."]'::jsonb, '["5–10 years of professional software-development experience with strong C#/.NET capability.","Hands-on experience with ASP.NET Core, REST APIs and relational databases.","Professional experience with React or Angular and TypeScript.","Understanding of secure development, automated testing, source control and CI/CD.","Ability to work across architecture, engineering, QA and delivery stakeholders."]'::jsonb,
    '["Azure application, identity, messaging or container-platform experience.","Experience with microservices, Docker, Kubernetes or event-driven integration.","Experience delivering applications in regulated or enterprise environments."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Engineers work in cross-functional delivery teams with shared ownership for quality and production readiness.","The role may involve client workshops, architecture discussions, implementation, code review and production-support collaboration."]'::jsonb, 'London-based with hybrid working. Client-site attendance may be required for selected engagements.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'application-engineering'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-APP-002', 'java-microservices-engineer', 'Java Microservices Engineer', 'Build resilient APIs, microservices and event-driven integrations for enterprise platforms with clear security and operational boundaries.', 'The Java Microservices Engineer will design and implement backend services and integration components used in distributed enterprise systems.

The role emphasises API design, event-driven integration, resilience, testability, observability and controlled deployment.',
    'UK', 'hybrid', 'full_time', '4–8 years',
    '["Java 17+","Spring Boot","REST","Kafka","PostgreSQL","Docker","Kubernetes","Git"]'::jsonb, '["Banking & Finance","Automotive","Media"]'::jsonb, '["Develop Spring Boot services, REST APIs and asynchronous integrations.","Design service contracts, error handling, idempotency, resilience and security controls.","Implement automated unit, integration and API tests.","Contribute to containerisation, CI/CD, deployment configuration and production observability.","Collaborate with architects, data teams and client engineers on integration design."]'::jsonb, '["4–8 years of professional Java development experience.","Strong Spring Boot, REST API and relational database experience.","Understanding of distributed systems, messaging and service-to-service integration.","Experience with automated testing, Git and CI/CD."]'::jsonb,
    '["Kafka or comparable event-streaming experience.","Docker/Kubernetes and cloud-platform exposure.","Experience in financial-services, automotive or high-volume digital platforms."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["This role works closely with client-aligned engineering teams and follows agreed architecture, release and quality standards.","Working location depends on the assigned engagement and may combine remote work with office or client-site collaboration."]'::jsonb, 'UK-based role. Exact office and client-site expectations are confirmed with the project assignment.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'application-engineering'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-CLOUD-001', 'cloud-platform-engineer', 'Cloud Platform Engineer', 'Build secure cloud foundations, infrastructure automation and container platforms that development teams can operate consistently at enterprise scale.', 'The Cloud Platform Engineer will help establish and improve cloud environments used by application, data and integration workloads.

The role includes infrastructure as code, identity, networking, container platforms, observability, resilience and repeatable delivery automation.',
    'London, UK', 'hybrid', 'full_time', '4–8 years',
    '["Azure","AWS","Terraform","Docker","Kubernetes","Linux","IAM","Networking","GitHub Actions"]'::jsonb, '["Banking & Finance","Media","Education","Automotive"]'::jsonb, '["Design and implement cloud infrastructure using reusable infrastructure-as-code modules.","Configure identity, networking, secrets, logging and policy controls in line with project requirements.","Build and support container and Kubernetes platform capabilities where appropriate.","Automate environment provisioning, deployment and operational checks through CI/CD.","Support cloud cost, reliability, security and operational-readiness reviews."]'::jsonb, '["4–8 years of infrastructure, cloud or platform-engineering experience.","Hands-on experience with Azure or AWS and infrastructure as code using Terraform or equivalent.","Good understanding of networking, identity, Linux, containers and CI/CD.","Experience troubleshooting production cloud and platform issues."]'::jsonb,
    '["Kubernetes administration or platform-engineering experience.","Exposure to landing zones, policy-as-code, observability and FinOps practices.","Cloud certification relevant to the technologies used in the assigned engagement."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Platform work is performed collaboratively with application, security, data and operations teams.","Changes are expected to be automated, reviewable, repeatable and supported by operational evidence."]'::jsonb, 'London-based hybrid role with potential UK client-site activity depending on the engagement.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'cloud-and-infrastructure'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-PLAT-001', 'devops-sre-engineer', 'DevOps / Site Reliability Engineer', 'Improve software delivery, deployment reliability, observability and operational resilience across cloud and application environments.', 'The DevOps / SRE Engineer will improve the path from source control to production and help delivery teams operate services with clearer reliability objectives and production telemetry.

The role combines pipeline automation, platform engineering, observability, incident learning and reliability improvement.',
    'UK', 'hybrid', 'full_time', '4–8 years',
    '["Azure DevOps","GitHub Actions","Jenkins","Docker","Kubernetes","Terraform","Prometheus","Grafana","Linux"]'::jsonb, '["Banking & Finance","Media","Automotive","Professional Services"]'::jsonb, '["Build and improve CI/CD pipelines, deployment automation and environment controls.","Implement observability through logs, metrics, traces, dashboards and actionable alerts.","Support container platforms, infrastructure as code and release automation.","Participate in incident review, root-cause analysis and reliability improvement work.","Work with engineering teams to define operational readiness and service-level expectations."]'::jsonb, '["4–8 years of DevOps, SRE, platform or production-engineering experience.","Strong CI/CD, Linux and scripting/automation skills.","Experience with containers, infrastructure as code and cloud environments.","Understanding of monitoring, incident management and reliability engineering."]'::jsonb,
    '["Kubernetes and Terraform experience in production environments.","Experience with Prometheus, Grafana, OpenTelemetry or equivalent observability tooling.","Knowledge of SLOs, error budgets and production-readiness practices."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["The role works across development and operations boundaries rather than as a release-only function.","Engineers are expected to automate repeatable tasks and convert operational incidents into measurable improvement work."]'::jsonb, 'UK-based client-aligned role. Working location and on-call expectations, if any, are confirmed before assignment.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'platform-engineering'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-SEC-001', 'cyber-security-engineer', 'Cyber Security Engineer', 'Strengthen security across identity, endpoints, cloud services and applications through practical controls, monitoring and risk-informed engineering.', 'The Cyber Security Engineer will support defensive security design and implementation across client environments, with emphasis on identity, cloud, endpoints, application delivery and operational monitoring.

The role is focused on authorised defensive work, security improvement and evidence-based control implementation.',
    'London, UK', 'hybrid', 'full_time', '4–8 years',
    '["Microsoft Entra ID","SIEM","EDR","Azure Security","AWS Security","Vulnerability Management","IAM","Security Monitoring"]'::jsonb, '["Banking & Finance","Education","Professional Services"]'::jsonb, '["Assess security posture and identify practical control gaps across identity, cloud, endpoint and application environments.","Support secure architecture reviews, hardening standards and security requirements for technology delivery.","Improve vulnerability-management, security-monitoring and incident-readiness processes.","Work with engineering teams to integrate security checks into delivery pipelines and operational processes.","Document risks, control decisions, exceptions and remediation actions."]'::jsonb, '["4–8 years of professional cyber-security, cloud-security or security-engineering experience.","Strong understanding of IAM, endpoint security, vulnerability management and security monitoring.","Practical experience securing Azure, AWS or comparable cloud environments.","Ability to communicate risk and remediation priorities to technical and business stakeholders."]'::jsonb,
    '["Experience with SIEM, EDR, Microsoft Entra ID or comparable enterprise security tooling.","Relevant security certification or demonstrable equivalent experience.","Experience in regulated or security-sensitive enterprise environments."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Security engineers work as part of authorised client and delivery teams with clear scope and access boundaries.","The role combines assessment, engineering, documentation and collaboration rather than isolated compliance reporting."]'::jsonb, 'London-based hybrid role. Some engagements may require controlled access to a UK client environment.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'cyber-security'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-QE-001', 'qa-automation-engineer', 'QA Automation Engineer', 'Build automated quality coverage across web applications, APIs and integration workflows so delivery teams can release with stronger evidence and lower regression risk.', 'The QA Automation Engineer will design automated test coverage for user journeys, APIs and integration points and help teams move quality checks earlier in the delivery lifecycle.

The role includes test strategy, automation, defect analysis, release evidence and collaboration with developers and product stakeholders.',
    'UK', 'hybrid', 'full_time', '3–6 years',
    '["Playwright","Selenium","Cypress","Postman","REST APIs","JavaScript","TypeScript","JMeter","CI/CD"]'::jsonb, '["Banking & Finance","Education","Media","Automotive"]'::jsonb, '["Design and maintain automated UI, API and integration test suites.","Translate requirements and risk into practical test scenarios and acceptance evidence.","Integrate automated tests into CI/CD pipelines and improve feedback speed.","Investigate failures with developers and distinguish product defects from test or environment issues.","Contribute to performance, accessibility and non-functional quality testing where required."]'::jsonb, '["3–6 years of software testing or quality-engineering experience.","Hands-on automation experience with Playwright, Selenium, Cypress or equivalent.","API testing experience and good understanding of HTTP/REST concepts.","Ability to write maintainable automation code and work with Git/CI pipelines."]'::jsonb,
    '["TypeScript or JavaScript automation experience.","Performance-testing exposure using JMeter, k6 or equivalent.","Experience testing cloud-hosted, data-intensive or regulated applications."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Quality engineering is embedded in delivery teams and begins during requirement and design discussions rather than after development completes.","The role requires regular collaboration with developers, analysts, product stakeholders and release teams."]'::jsonb, 'UK-based hybrid role. Client-site attendance may be required for selected programmes.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'quality-engineering'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-SUP-001', 'application-support-engineer', 'Application Support Engineer', 'Support business-critical applications through structured incident ownership, diagnosis, operational monitoring and continuous service improvement.', 'The Application Support Engineer will provide structured L2/L3 support for enterprise applications and related integrations, working with engineering teams to restore service and reduce repeat incidents.

The role is operationally focused but requires strong technical analysis and communication.',
    'London, UK', 'hybrid', 'full_time', '3–6 years',
    '["SQL","Linux","Windows Server","REST APIs","Monitoring","ITSM","Azure","Log Analysis"]'::jsonb, '["Banking & Finance","Education","Professional Services"]'::jsonb, '["Own incident investigation and coordinate escalation across application, infrastructure and supplier teams.","Use logs, SQL, monitoring and application knowledge to diagnose faults and identify root causes.","Maintain runbooks, known-error records and service-support documentation.","Support release validation, production changes and operational-readiness activities.","Identify recurring issues and convert them into service-improvement or engineering actions."]'::jsonb, '["3–6 years of application support, production support or technical operations experience.","Good SQL, log-analysis and troubleshooting capability.","Working knowledge of Linux or Windows server environments and web/API concepts.","Strong incident communication and stakeholder-management skills."]'::jsonb,
    '["ITIL or service-management experience.","Azure or other cloud-platform exposure.","Experience supporting enterprise or regulated applications."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["The role works to agreed service priorities, escalation paths and client operating procedures.","Any shift, out-of-hours or on-call requirement will be stated for the assigned support engagement before appointment."]'::jsonb, 'London-based role. Exact hybrid, shift and client-site requirements depend on the support assignment and are confirmed in advance.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'it-support-services'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-CONS-001', 'technical-business-analyst', 'Technical Business Analyst', 'Translate business problems into clear process, data, integration and technology requirements that engineering teams can implement and stakeholders can validate.', 'The Technical Business Analyst will work between business stakeholders and technology delivery teams to define requirements, process changes, interfaces and measurable acceptance criteria.

The role suits analysts who can understand both business workflows and the technical implications of system, API and data changes.',
    'London, UK', 'hybrid', 'full_time', '3–7 years',
    '["Jira","Confluence","BPMN","UML","REST APIs","SQL","Process Mapping","Agile Delivery"]'::jsonb, '["Banking & Finance","Education","Automotive","Professional Services"]'::jsonb, '["Facilitate discovery workshops and document current-state and target-state processes.","Define functional, data, integration and non-functional requirements with clear acceptance criteria.","Support API, data-mapping and system-integration discussions with engineering teams.","Manage requirements traceability, assumptions, decisions and change impacts.","Support testing, stakeholder validation and implementation readiness."]'::jsonb, '["3–7 years of business-analysis experience in technology or digital-delivery environments.","Strong requirements, process-mapping and stakeholder-facilitation skills.","Understanding of APIs, data flows, system integration and software-delivery lifecycles.","Experience working in Agile, hybrid or structured programme environments."]'::jsonb,
    '["SQL/data-analysis capability.","Experience with BPMN/UML, Jira and Confluence.","Industry experience in financial services, education, automotive or enterprise technology."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["The role is workshop- and stakeholder-intensive and requires regular collaboration with client business, architecture and engineering teams.","Analysts are expected to keep scope, assumptions, decisions and unresolved questions visible throughout delivery."]'::jsonb, 'London-based hybrid role with client workshops and project meetings as required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'technology-consulting'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-MGMT-001', 'technical-delivery-manager', 'Technical Delivery Manager', 'Lead complex technology delivery across application, cloud, data and integration workstreams with clear governance, dependency management and release accountability.', 'The Technical Delivery Manager will coordinate multi-disciplinary technology work from planning through release and operational handover.

The role requires sufficient technical understanding to challenge dependencies, quality, architecture and operational-readiness decisions while maintaining delivery governance.',
    'London, UK', 'hybrid', 'full_time', '7–10 years',
    '["Agile Delivery","Jira","Azure DevOps","Cloud Delivery","APIs","Data Platforms","Release Governance","Risk Management"]'::jsonb, '["Banking & Finance","Automotive","Media","Education"]'::jsonb, '["Own delivery plans, milestones, dependencies, risks, decisions and stakeholder reporting.","Coordinate engineering, QA, architecture, security, data and operational workstreams.","Ensure scope changes, assumptions and delivery risks are visible and actively managed.","Facilitate release readiness, go-live decisions and operational handover.","Support commercial and resource planning where required by the engagement."]'::jsonb, '["7–10 years of technology-delivery experience, including leadership of cross-functional teams.","Strong understanding of software, cloud, data or integration delivery lifecycles.","Demonstrated experience with risk, dependency, stakeholder and release management.","Ability to communicate effectively with technical teams, client leadership and delivery partners."]'::jsonb,
    '["Experience delivering programmes in regulated or multi-supplier environments.","Agile, Scrum, SAFe, PRINCE2 or comparable delivery certification where relevant.","Experience with Azure DevOps, Jira or equivalent delivery-management tooling."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["This is a client-facing delivery role with regular governance, planning and cross-team coordination responsibilities.","Hybrid and client-site expectations depend on the programme and are confirmed for the assignment."]'::jsonb, 'London-based with UK client-site attendance where the engagement requires it.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'strategy-and-implementation'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-AUTO-001', 'automotive-integration-engineer', 'Automotive Integration Engineer', 'Engineer reliable integration between connected-product, enterprise and operational systems in automotive and mobility environments.', 'The Automotive Integration Engineer will support integration across vehicle-related data flows, digital products and enterprise platforms for automotive and mobility programmes.

The role focuses on interface reliability, event flows, data contracts, security boundaries and operational visibility.',
    'UK', 'hybrid', 'full_time', '4–8 years',
    '["REST APIs","Kafka","MQTT","Java or .NET","Azure or AWS","SQL","Docker","Observability"]'::jsonb, '["Automotive"]'::jsonb, '["Design and implement APIs, messaging and event-driven integration patterns.","Define data contracts, error handling, retry behaviour and interface monitoring.","Work with product, enterprise and cloud teams to resolve cross-system dependencies.","Support automated integration testing and production observability.","Document interface ownership, operational procedures and known failure modes."]'::jsonb, '["4–8 years of integration, backend or platform-engineering experience.","Strong REST/API and messaging experience with Java, .NET or comparable backend technologies.","Understanding of event-driven architectures and distributed-system reliability.","Experience with cloud platforms, SQL and production troubleshooting."]'::jsonb,
    '["Automotive, mobility, telematics or connected-product experience.","Kafka, MQTT, container or observability-platform experience.","Knowledge of secure integration and high-volume event-processing patterns."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["This role is strongly client- and integration-team aligned and may involve workshops with multiple system owners.","The engineer is expected to make dependencies, interface assumptions and operational risks explicit throughout delivery."]'::jsonb, 'UK client-aligned role. Exact location depends on the automotive programme and is confirmed before assignment.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'automotive-technology'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-EDU-001', 'education-platform-engineer', 'Education Platform Full Stack Engineer', 'Build secure, accessible digital services and workflow platforms for education users, staff and administrative operations.', 'The Education Platform Full Stack Engineer will develop web applications and workflow capabilities used by learners, staff and education administrators.

The role requires strong attention to accessibility, role-based access, secure data handling, usability and maintainable application architecture.',
    'London, UK', 'hybrid', 'full_time', '4–7 years',
    '["React","Next.js","TypeScript","Node.js or .NET","PostgreSQL","REST APIs","RBAC","WCAG"]'::jsonb, '["Education"]'::jsonb, '["Build responsive, accessible user interfaces and backend APIs for education workflows.","Implement role-based access, validation, audit-friendly workflows and secure data handling.","Integrate application services with data, document and communication systems.","Develop automated tests and contribute to code review, CI/CD and release readiness.","Work with analysts and education stakeholders to translate service journeys into maintainable software."]'::jsonb, '["4–7 years of full-stack web-development experience.","Strong React/TypeScript experience plus backend development using Node.js, .NET or equivalent.","Experience with relational databases, REST APIs and secure application-development practices.","Understanding of responsive design and web accessibility."]'::jsonb,
    '["Experience with Next.js, PostgreSQL, RBAC and audit logging.","Education, public-sector or workflow-platform experience.","Familiarity with WCAG and privacy-aware product design."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["The role works closely with product, education-domain, design and engineering stakeholders.","Accessibility, privacy and role separation are treated as engineering requirements rather than post-release additions."]'::jsonb, 'London-based hybrid role with stakeholder workshops as required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'education-technology'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-DATA-003', 'data-engineer', 'Data Engineer', 'Build production-grade ingestion, transformation and orchestration pipelines that make enterprise data reliable and usable across reporting, analytics and operational workflows.', 'The Data Engineer will develop and support reusable data pipelines, transformation logic and quality controls for cloud and enterprise data platforms.

The role requires practical engineering discipline around observability, recoverability, performance, schema change and deployment rather than one-off data movement.',
    'London, UK', 'hybrid', 'full_time', '3–5 years',
    '["Python","SQL","PySpark","Azure Data Factory","Databricks","dbt","Airflow","Git"]'::jsonb, '["Banking & Finance","Education","Media","Professional Services"]'::jsonb, '["Develop batch and incremental ingestion pipelines from databases, APIs, files and event sources.","Build transformation models, data-quality checks, orchestration and failure-recovery logic.","Optimise SQL, Spark and pipeline workloads for performance and cost.","Work with analysts and engineers to define source-to-target mappings, data contracts and ownership.","Contribute to CI/CD, code review, monitoring and production support for data workloads."]'::jsonb, '["3–5 years of professional data-engineering, ETL/ELT or closely related software-engineering experience.","Strong SQL and working Python skills.","Hands-on experience with at least one cloud data platform or distributed processing framework.","Understanding of dimensional modelling, data quality, orchestration and version control."]'::jsonb,
    '["Experience with Databricks, Microsoft Fabric, dbt, Airflow or equivalent tooling.","Exposure to streaming, data observability or governance platforms.","Experience supporting production data pipelines in multi-system environments."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Engineers work in cross-functional data teams with peer review and defined production ownership.","Hybrid collaboration is expected for design reviews, stakeholder workshops and delivery planning."]'::jsonb, 'London-based hybrid role with occasional UK client-site activity depending on the engagement.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'data-and-analytics'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-DATA-004', 'lead-data-engineer', 'Lead Data Engineer', 'Lead the architecture and engineering of enterprise data platforms, establishing technical standards, delivery patterns and production ownership across complex data programmes.', 'The Lead Data Engineer will own technical direction across data ingestion, transformation, storage, integration, governance and operational reliability.

The role combines hands-on architecture with engineering leadership, design review, stakeholder communication and delivery assurance across multiple workstreams.',
    'London, UK', 'hybrid', 'full_time', '9–12 years',
    '["Python","SQL","Spark","Databricks","Microsoft Fabric","Snowflake","Kafka","Terraform","Azure/AWS"]'::jsonb, '["Banking & Finance","Automotive","Media","Education"]'::jsonb, '["Define data-platform architecture, engineering standards and reusable delivery patterns.","Lead design reviews covering scalability, security, lineage, observability, resilience and cost.","Guide engineers on implementation, code quality, testing and production support practices.","Coordinate with solution architects, security, application and analytics teams on cross-platform dependencies.","Own technical risk, migration sequencing and operational-readiness decisions for major data releases."]'::jsonb, '["9–12 years of data-engineering or enterprise software-engineering experience, including technical leadership.","Deep SQL and strong Python/Spark capability with production-scale platform experience.","Experience architecting modern cloud data platforms and distributed data-processing solutions.","Strong knowledge of data modelling, governance, security, lineage and operational support.","Ability to lead technical decisions with senior engineering and business stakeholders."]'::jsonb,
    '["Experience with Databricks, Microsoft Fabric, Snowflake, Kafka or equivalent enterprise platforms.","Experience in regulated or high-volume environments.","Cloud architecture or data-platform certification where relevant."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["This is a senior client-facing engineering role with responsibility for architecture quality and team technical direction.","The role combines design leadership with hands-on review and delivery governance."]'::jsonb, 'London-based with UK client-site workshops and architecture sessions where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'data-and-analytics'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-DATA-005', 'data-analyst', 'Data Analyst', 'Turn operational and business data into clear analysis, reliable metrics and decision-ready reporting for client and internal stakeholders.', 'The Data Analyst will investigate business questions, validate source data, define measures and communicate findings through concise analysis and visual reporting.

The role requires strong numerical reasoning and the ability to explain assumptions, limitations and business implications clearly.',
    'London, UK', 'hybrid', 'full_time', '3–5 years',
    '["SQL","Power BI","Excel","Python","DAX","Tableau","Microsoft Fabric"]'::jsonb, '["Banking & Finance","Education","Professional Services","Media"]'::jsonb, '["Analyse operational, customer, financial or service data to answer defined business questions.","Develop SQL queries, reusable datasets, dashboards and recurring analytical reports.","Validate data quality, reconcile conflicting metrics and document business definitions.","Work with stakeholders to translate ambiguous questions into measurable analytical requirements.","Present findings, trends and exceptions with clear supporting evidence."]'::jsonb, '["3–5 years of professional data-analysis, BI or reporting experience.","Strong SQL and Excel skills with practical dashboarding experience.","Ability to interpret data, identify anomalies and communicate findings to non-technical audiences.","Understanding of data quality, KPI definition and basic statistical concepts."]'::jsonb,
    '["Power BI, Tableau or comparable visualisation experience.","Python or R for analysis and automation.","Experience working with financial, education or operational datasets."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Analysts work closely with business stakeholders and data engineers to keep analysis grounded in reliable data definitions.","Hybrid attendance supports workshops, reporting reviews and stakeholder presentations."]'::jsonb, 'London-based hybrid role with occasional client workshops.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'data-and-analytics'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-DATA-006', 'senior-data-analyst', 'Senior Data Analyst', 'Lead complex analysis, KPI design and executive reporting while improving analytical standards, metric governance and stakeholder decision support.', 'The Senior Data Analyst will own analytical workstreams that require deeper investigation, cross-source reconciliation and management-level communication.

The role also supports metric governance, analytical quality and mentoring of less experienced analysts.',
    'London, UK', 'hybrid', 'full_time', '5–8 years',
    '["SQL","Power BI","DAX","Python","Tableau","Microsoft Fabric","dbt"]'::jsonb, '["Banking & Finance","Automotive","Education","Professional Services"]'::jsonb, '["Lead complex analytical investigations across multiple systems and business domains.","Define KPIs, calculation logic, thresholds and reporting standards with accountable business owners.","Develop and review dashboards, analytical models and executive-level reporting packs.","Partner with data engineering teams to improve source quality and analytical data structures.","Mentor analysts and establish reusable analytical methods and documentation standards."]'::jsonb, '["5–8 years of professional analytics, BI or decision-support experience.","Advanced SQL and strong Power BI/Tableau experience.","Demonstrated ability to lead stakeholder analysis and explain complex findings clearly.","Strong understanding of metric governance, data quality and analytical validation."]'::jsonb,
    '["Python, statistical modelling or experimentation experience.","Exposure to Microsoft Fabric, dbt or modern analytics-engineering practices.","Experience in regulated or multi-business-unit organisations."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["This role combines hands-on analysis with stakeholder leadership and review responsibilities.","Candidates should be comfortable challenging metric definitions and presenting evidence to senior stakeholders."]'::jsonb, 'London-based hybrid role with client-facing analytical workshops where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'data-and-analytics'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-DATA-007', 'data-scientist', 'Data Scientist', 'Develop statistical and machine-learning solutions that are evaluated against measurable business outcomes and integrated into controlled production workflows.', 'The Data Scientist will develop predictive, classification, forecasting and optimisation solutions using governed enterprise data.

The role includes problem framing, feature development, evaluation, explainability and collaboration with engineers to move successful models into production.',
    'London, UK', 'hybrid', 'full_time', '3–6 years',
    '["Python","Pandas","scikit-learn","SQL","Jupyter","MLflow","Databricks","Azure ML"]'::jsonb, '["Banking & Finance","Automotive","Media","Education"]'::jsonb, '["Translate business problems into testable analytical and machine-learning hypotheses.","Prepare data, engineer features and build reproducible modelling pipelines.","Select appropriate evaluation metrics and compare model performance against practical baselines.","Document assumptions, limitations, bias considerations and model behaviour.","Work with data and platform engineers on deployment, monitoring and model lifecycle controls."]'::jsonb, '["3–6 years of professional data-science, machine-learning or advanced analytics experience.","Strong Python, SQL and statistical modelling skills.","Hands-on experience with supervised and unsupervised machine-learning techniques.","Understanding of model evaluation, feature engineering and reproducible experimentation."]'::jsonb,
    '["Experience with MLflow, Databricks, Azure ML or comparable MLOps tooling.","Time-series, NLP or optimisation experience.","Experience deploying models into business or digital-product workflows."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Data scientists work with business owners, analysts, data engineers and application teams throughout the model lifecycle.","Model quality and business usefulness are reviewed together rather than treating offline accuracy as the only success measure."]'::jsonb, 'London-based hybrid role with project-specific client collaboration.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'data-science-and-ai'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-DATA-008', 'senior-data-scientist', 'Senior Data Scientist', 'Lead advanced analytics and machine-learning workstreams from problem framing through evaluation, production integration and model governance.', 'The Senior Data Scientist will lead technically demanding modelling initiatives and establish rigorous evaluation, governance and handover practices.

The role requires the ability to connect statistical methods and machine learning to business decisions, production constraints and accountable operating processes.',
    'London, UK', 'hybrid', 'full_time', '6–10 years',
    '["Python","scikit-learn","XGBoost","PyTorch","SQL","MLflow","Databricks","Azure/AWS ML"]'::jsonb, '["Banking & Finance","Automotive","Media","Professional Services"]'::jsonb, '["Lead model design, feature strategy, experimentation and evaluation for complex use cases.","Set standards for reproducibility, explainability, monitoring and model-risk documentation.","Review analytical methods and mentor data scientists and analysts.","Partner with engineering teams on deployment architecture, serving patterns and operational controls.","Communicate model trade-offs, uncertainty and business implications to senior stakeholders."]'::jsonb, '["6–10 years of professional data-science, machine-learning or advanced statistical-modelling experience.","Advanced Python and strong statistical foundations.","Experience leading end-to-end model development from discovery through productionisation.","Strong understanding of evaluation design, model monitoring and governance."]'::jsonb,
    '["Experience with deep learning, NLP, forecasting or optimisation in production.","MLOps experience using MLflow, Databricks, Azure ML, SageMaker or equivalent.","Experience in regulated or decision-critical use cases."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["The role combines hands-on modelling with technical leadership, review and stakeholder engagement.","Senior data scientists are expected to make uncertainty, assumptions and model limitations explicit."]'::jsonb, 'London-based hybrid role with client-facing workshops and technical reviews as required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'data-science-and-ai'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-DB-001', 'database-designer-data-modeler', 'Database Designer / Data Modeler', 'Design logical and physical data models that support reliable applications, analytics, integration and long-term maintainability across enterprise systems.', 'The Database Designer / Data Modeler will translate business concepts and system requirements into coherent conceptual, logical and physical data models.

The role supports both transactional and analytical workloads and requires careful attention to integrity, naming, ownership, lifecycle and integration.',
    'London, UK', 'hybrid', 'full_time', '4–7 years',
    '["SQL Server","PostgreSQL","Oracle","ER/Studio","ERwin","dbdiagram","SQL","Data Vault","Dimensional Modelling"]'::jsonb, '["Banking & Finance","Education","Automotive","Professional Services"]'::jsonb, '["Develop conceptual, logical and physical data models for new and modernised systems.","Define entities, relationships, keys, constraints, reference data and naming standards.","Review application and integration designs for data consistency and duplication risk.","Support schema evolution, migration mapping and model version control.","Maintain data dictionaries and modelling documentation aligned with business definitions."]'::jsonb, '["4–7 years of professional database design, data modelling or data architecture experience.","Strong relational modelling and SQL knowledge.","Experience with at least one major relational database platform.","Understanding of normalisation, dimensional modelling and data-integrity principles."]'::jsonb,
    '["Experience with ERwin, ER/Studio or comparable modelling tools.","Exposure to Data Vault, canonical models or enterprise integration patterns.","Experience supporting cloud database migration or modernisation."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["The role works closely with business analysts, application architects, data engineers and database administrators.","Model changes are reviewed for downstream impact before implementation."]'::jsonb, 'London-based hybrid role with architecture and design workshops as required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'data-architecture'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-DB-002', 'senior-database-architect', 'Senior Database Architect', 'Define enterprise database architecture, modelling standards, migration strategy and non-functional design for high-value transactional and analytical systems.', 'The Senior Database Architect will own database and data-store architecture across programmes that require strong integrity, availability, performance, security and migration control.

The role balances application requirements with operational concerns such as backup, recovery, replication, lifecycle, cost and supportability.',
    'London, UK', 'hybrid', 'full_time', '8–12 years',
    '["PostgreSQL","SQL Server","Oracle","Azure SQL","AWS RDS","Snowflake","Data Modelling","HA/DR","Performance Tuning"]'::jsonb, '["Banking & Finance","Automotive","Education","Professional Services"]'::jsonb, '["Define database architecture and standards across transactional and analytical workloads.","Review physical data models, indexing, partitioning, concurrency, security and performance design.","Lead database migration, consolidation and refactoring strategies with rollback and validation planning.","Establish HA/DR, backup, recovery, monitoring and capacity requirements.","Guide engineering teams on database technology selection and production-readiness decisions."]'::jsonb, '["8–12 years of database engineering, database architecture or data-platform experience.","Deep knowledge of relational database architecture, SQL and performance engineering.","Experience designing high-availability, resilient and secure database platforms.","Strong understanding of migration, replication, recovery and operational support."]'::jsonb,
    '["Experience with PostgreSQL, SQL Server, Oracle and managed cloud database services.","Exposure to distributed SQL, Snowflake or analytical data platforms.","Experience in regulated or high-availability enterprise environments."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["This is a senior architecture role working across application, platform, data and operations teams.","The architect is expected to document decisions, challenge unsafe assumptions and lead technical reviews."]'::jsonb, 'London-based with UK client-site architecture workshops where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'data-architecture'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-DATA-009', 'analytics-engineer', 'Analytics Engineer', 'Build tested, documented analytical data models and semantic layers that bridge data engineering and business intelligence teams.', 'The Analytics Engineer will transform raw platform data into governed, reusable analytical models for reporting, self-service analytics and data products.

The role emphasises software-engineering practices in analytics: testing, documentation, version control, modularity and controlled deployment.',
    'London, UK', 'hybrid', 'full_time', '3–6 years',
    '["SQL","dbt","Snowflake","Databricks","Microsoft Fabric","Power BI","Git","CI/CD"]'::jsonb, '["Banking & Finance","Education","Media","Professional Services"]'::jsonb, '["Develop modular SQL/dbt models and reusable business logic.","Implement tests, documentation, lineage and CI checks for analytical transformations.","Partner with BI teams on semantic models and metric definitions.","Optimise warehouse queries and model structures for performance and maintainability.","Support release management and production troubleshooting for analytical datasets."]'::jsonb, '["3–6 years of analytics engineering, BI engineering or data-development experience.","Advanced SQL and hands-on dbt or comparable transformation-framework experience.","Understanding of dimensional modelling, testing and source-control practices.","Experience working with a modern cloud warehouse or lakehouse."]'::jsonb,
    '["Snowflake, Databricks or Microsoft Fabric experience.","Power BI semantic modelling experience.","Exposure to data observability and metadata platforms."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Analytics engineers work closely with data engineers, analysts and BI developers to keep business logic reusable and governed.","Changes follow code review and controlled release practices."]'::jsonb, 'London-based hybrid role.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'data-and-analytics'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-DATA-010', 'data-platform-architect', 'Data Platform Architect', 'Define target-state data-platform architecture across ingestion, storage, processing, governance, analytics and AI workloads for enterprise transformation programmes.', 'The Data Platform Architect will define scalable platform architecture and transition roadmaps for enterprise data, analytics and AI workloads.

The role requires broad knowledge across data engineering, cloud, security, governance, integration and operating-model design.',
    'London, UK', 'hybrid', 'full_time', '9–12 years',
    '["Azure","AWS","Databricks","Microsoft Fabric","Snowflake","Kafka","dbt","Terraform","Data Governance"]'::jsonb, '["Banking & Finance","Automotive","Media","Education"]'::jsonb, '["Define current-state assessment, target architecture and staged transition roadmap for data platforms.","Select platform patterns based on workload, latency, security, governance, resilience and cost requirements.","Design ingestion, storage, processing, metadata, lineage and access-control architecture.","Lead architecture governance across engineering teams and suppliers.","Support platform operating-model, ownership, FinOps and production-readiness decisions."]'::jsonb, '["9–12 years of data-engineering, data-platform or solution-architecture experience.","Proven experience designing enterprise cloud data platforms.","Strong understanding of distributed data processing, security, governance, integration and analytics architecture.","Ability to communicate architecture decisions to senior technical and business stakeholders."]'::jsonb,
    '["Experience with Databricks, Microsoft Fabric, Snowflake, Kafka or equivalent enterprise platforms.","Cloud and data architecture certifications where relevant.","Experience defining migration roadmaps for legacy warehouse or data-platform estates."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["This is a senior client-facing architecture role spanning discovery, target-state design and delivery governance.","Architects are expected to keep trade-offs, dependencies and risks explicit throughout the programme."]'::jsonb, 'London-based with UK client-site architecture workshops where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'data-architecture'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-CONS-002', 'business-analyst', 'Business Analyst', 'Translate business needs into clear process, functional, data and technology requirements that delivery teams can implement and stakeholders can validate.', 'The Business Analyst will support discovery, requirements definition, process improvement and delivery validation across digital and technology programmes.',
    'London, UK', 'hybrid', 'full_time', '3–5 years',
    '["Jira","Confluence","BPMN","UML","SQL","REST APIs","Process Mapping","Agile Delivery"]'::jsonb, '["Banking & Finance","Education","Automotive","Professional Services"]'::jsonb, '["Facilitate stakeholder workshops and document current-state and target-state processes.","Define functional and non-functional requirements with measurable acceptance criteria.","Support data mapping, integration and workflow discussions with engineering teams.","Maintain assumptions, decisions, dependencies and requirements traceability.","Support testing, business validation and implementation readiness."]'::jsonb, '["3–5 years of business-analysis experience in technology or digital-delivery environments.","Strong requirements, process-mapping and stakeholder communication skills.","Understanding of software delivery, APIs, data flows and system integration."]'::jsonb,
    '["SQL or data-analysis capability.","Experience with BPMN/UML, Jira and Confluence.","Industry experience aligned to RC client sectors."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.","Hybrid or client-site attendance varies by engagement and is confirmed before assignment."]'::jsonb, 'London-based with UK client-site collaboration where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'technology-consulting'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-CONS-003', 'senior-business-analyst', 'Senior Business Analyst', 'Lead complex discovery and requirements workstreams across multi-system transformation programmes, connecting business outcomes to technology delivery and operating change.', 'The Senior Business Analyst will lead stakeholder discovery, scope definition and cross-functional analysis where processes, data and systems span multiple teams.',
    'London, UK', 'hybrid', 'full_time', '6–10 years',
    '["Jira","Confluence","BPMN","UML","SQL","APIs","Data Mapping","Agile / Hybrid Delivery"]'::jsonb, '["Banking & Finance","Education","Automotive","Professional Services"]'::jsonb, '["Lead discovery workshops and resolve conflicting stakeholder requirements.","Define target-state processes, business rules, data requirements and integration impacts.","Coach analysts and review requirement quality and traceability.","Support programme scope, risk, dependency and change-control decisions.","Work with architects and delivery leads to keep business intent visible through implementation."]'::jsonb, '["6–10 years of business-analysis experience, including complex enterprise programmes.","Strong facilitation, process modelling, requirements governance and stakeholder-management capability.","Good understanding of integration, data and software-delivery lifecycles."]'::jsonb,
    '["Experience in regulated or multi-supplier programmes.","Relevant BA or delivery certification where applicable.","Experience mentoring analysts."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.","Hybrid or client-site attendance varies by engagement and is confirmed before assignment."]'::jsonb, 'London-based with UK client-site collaboration where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'technology-consulting'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-QE-002', 'qa-engineer', 'QA Engineer', 'Validate web applications, APIs and business workflows through structured functional, integration and regression testing with clear defect evidence.', 'The QA Engineer will design and execute risk-based test coverage and work closely with analysts and developers to improve release quality.',
    'London, UK', 'hybrid', 'full_time', '3–5 years',
    '["Postman","REST APIs","SQL","Playwright","Selenium","Jira","Test Management","CI/CD"]'::jsonb, '["Banking & Finance","Education","Media","Automotive"]'::jsonb, '["Create test scenarios from requirements and business risk.","Execute functional, regression, API and integration testing.","Document defects with reproducible evidence and business impact.","Support test-data preparation and environment validation.","Contribute to release-readiness and quality reporting."]'::jsonb, '["3–5 years of software testing or quality-assurance experience.","Strong understanding of functional, regression and API testing.","Working SQL knowledge and ability to analyse defects across system boundaries."]'::jsonb,
    '["Automation exposure using Playwright, Selenium or Cypress.","Experience with Agile delivery and CI/CD.","Accessibility or performance-testing exposure."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.","Hybrid or client-site attendance varies by engagement and is confirmed before assignment."]'::jsonb, 'London-based with UK client-site collaboration where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'quality-engineering'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-QE-003', 'senior-qa-automation-engineer', 'Senior QA Automation Engineer', 'Lead automated quality engineering across UI, API and integration layers, establishing reusable test architecture and faster release feedback.', 'The Senior QA Automation Engineer will design automation frameworks, mentor testers and integrate quality evidence into delivery pipelines.',
    'London, UK', 'hybrid', 'full_time', '5–9 years',
    '["Playwright","Selenium","Cypress","TypeScript","Java","Postman","JMeter","CI/CD"]'::jsonb, '["Banking & Finance","Education","Media","Automotive"]'::jsonb, '["Design maintainable UI, API and integration automation frameworks.","Integrate automated suites with CI/CD and release gates.","Review test strategy, coverage and flaky-test root causes.","Support performance, accessibility and non-functional testing where required.","Coach QA engineers and collaborate with developers on testability."]'::jsonb, '["5–9 years of QA or quality-engineering experience with strong automation depth.","Hands-on experience with modern UI and API automation frameworks.","Strong coding, debugging and CI/CD skills."]'::jsonb,
    '["TypeScript/Java automation experience.","Performance-testing experience using JMeter, k6 or equivalent.","Experience defining test architecture for enterprise applications."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.","Hybrid or client-site attendance varies by engagement and is confirmed before assignment."]'::jsonb, 'London-based with UK client-site collaboration where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'quality-engineering'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-DATA-011', 'data-warehouse-engineer', 'Data Warehouse Engineer', 'Design and build governed analytical warehouse structures, ETL/ELT pipelines and dimensional models for reliable enterprise reporting and analytics.', 'The Data Warehouse Engineer will develop warehouse schemas, transformation pipelines and performance controls for enterprise analytical workloads.',
    'London, UK', 'hybrid', 'full_time', '4–7 years',
    '["SQL","Snowflake","Microsoft Fabric","Azure Synapse","Databricks","dbt","SSIS","Power BI"]'::jsonb, '["Banking & Finance","Education","Media","Professional Services"]'::jsonb, '["Design fact and dimension models aligned to reporting requirements.","Build ETL/ELT pipelines, history handling and data-quality controls.","Optimise warehouse queries, storage and refresh performance.","Document lineage, source-to-target mappings and business definitions.","Support release, monitoring and production issue resolution."]'::jsonb, '["4–7 years of data-warehouse, ETL/ELT or analytics-engineering experience.","Strong SQL and dimensional-modelling capability.","Hands-on experience with at least one modern warehouse or lakehouse platform."]'::jsonb,
    '["Snowflake, Fabric, Synapse or Databricks experience.","dbt or SSIS experience.","Experience with enterprise BI and governed semantic models."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.","Hybrid or client-site attendance varies by engagement and is confirmed before assignment."]'::jsonb, 'London-based with UK client-site collaboration where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'data-and-analytics'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-DATA-012', 'senior-data-warehouse-engineer', 'Senior Data Warehouse Engineer', 'Lead warehouse architecture, dimensional modelling and migration workstreams for enterprise reporting platforms with strong performance, governance and operational controls.', 'The Senior Data Warehouse Engineer will own design quality across warehouse, lakehouse and semantic-layer workstreams and support migration from legacy analytical platforms.',
    'London, UK', 'hybrid', 'full_time', '7–10 years',
    '["Snowflake","Microsoft Fabric","Azure Synapse","Databricks","SQL","dbt","SSIS","Data Vault"]'::jsonb, '["Banking & Finance","Automotive","Education","Professional Services"]'::jsonb, '["Lead target data-model and warehouse architecture decisions.","Review ETL/ELT design, history management, reconciliation and performance.","Plan legacy warehouse migration and cutover with validation and rollback controls.","Mentor engineers and establish modelling and testing standards.","Coordinate with BI, governance and platform teams on release and support."]'::jsonb, '["7–10 years of data-warehouse or analytics-platform engineering experience.","Advanced SQL, dimensional modelling and warehouse performance expertise.","Experience leading enterprise data migrations or modernisation programmes."]'::jsonb,
    '["Data Vault, Snowflake, Fabric, Synapse or Databricks experience.","Strong data-governance and lineage knowledge.","Experience in regulated environments."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.","Hybrid or client-site attendance varies by engagement and is confirmed before assignment."]'::jsonb, 'London-based with UK client-site collaboration where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'data-and-analytics'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-DATA-013', 'etl-developer', 'ETL / ELT Developer', 'Develop reliable data-integration workflows across source systems, warehouses and cloud data platforms with automated validation and recoverability.', 'The ETL / ELT Developer will implement ingestion and transformation workflows and support data-quality and production-monitoring requirements.',
    'London, UK', 'hybrid', 'full_time', '3–6 years',
    '["SQL","SSIS","Azure Data Factory","dbt","Python","Airflow","Databricks"]'::jsonb, '["Banking & Finance","Education","Media","Professional Services"]'::jsonb, '["Build scheduled and incremental data pipelines.","Implement source-to-target transformations and validation rules.","Handle failures, retries, logging and operational alerts.","Optimise SQL and pipeline performance.","Support deployment and production troubleshooting."]'::jsonb, '["3–6 years of ETL/ELT or data-integration development experience.","Strong SQL and hands-on experience with at least one orchestration or ETL platform.","Understanding of data quality, scheduling and production support."]'::jsonb,
    '["ADF, SSIS, dbt, Airflow or Databricks experience.","Python scripting capability.","Cloud data-platform exposure."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.","Hybrid or client-site attendance varies by engagement and is confirmed before assignment."]'::jsonb, 'London-based with UK client-site collaboration where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'data-and-analytics'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-SEC-002', 'soc-analyst', 'SOC Analyst', 'Monitor, investigate and escalate security events using SIEM, endpoint and cloud telemetry within authorised defensive-security operations.', 'The SOC Analyst will triage alerts, investigate suspicious activity and maintain evidence and escalation quality across defensive-security operations.',
    'London, UK', 'hybrid', 'full_time', '3–5 years',
    '["SIEM","Microsoft Sentinel","Splunk","EDR","Microsoft Defender","IAM","Log Analysis","Incident Response"]'::jsonb, '["Banking & Finance","Education","Professional Services"]'::jsonb, '["Monitor and triage security alerts from SIEM, EDR and cloud platforms.","Investigate events using logs, identity and endpoint evidence.","Escalate incidents using defined severity and response procedures.","Maintain investigation notes, indicators and case evidence.","Contribute to detection tuning and playbook improvement."]'::jsonb, '["3–5 years of SOC, security-operations or cyber-monitoring experience.","Practical SIEM and log-analysis experience.","Good understanding of identity, endpoint, network and cloud security concepts."]'::jsonb,
    '["Microsoft Sentinel, Splunk or Defender experience.","Incident-response or threat-hunting exposure.","Relevant security certification or equivalent experience."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.","Hybrid or client-site attendance varies by engagement and is confirmed before assignment."]'::jsonb, 'London-based with UK client-site collaboration where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'cyber-security'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-SEC-003', 'senior-cyber-security-analyst', 'Senior Cyber Security Analyst', 'Lead security investigations, control assessments and defensive improvement work across identity, endpoints, cloud and application environments.', 'The Senior Cyber Security Analyst will combine operational security analysis with control review, incident leadership and improvement planning.',
    'London, UK', 'hybrid', 'full_time', '5–8 years',
    '["SIEM","EDR","Microsoft Sentinel","Splunk","IAM","Vulnerability Management","Cloud Security","Incident Response"]'::jsonb, '["Banking & Finance","Education","Professional Services"]'::jsonb, '["Lead complex incident investigation and evidence review.","Assess security-control gaps and prioritise remediation.","Improve detection rules, escalation paths and response playbooks.","Support vulnerability and security-risk reporting.","Mentor analysts and coordinate with engineering teams on defensive improvements."]'::jsonb, '["5–8 years of cyber-security or security-operations experience.","Strong SIEM, endpoint, IAM and incident-analysis capability.","Ability to communicate security risk and remediation priorities clearly."]'::jsonb,
    '["Cloud-security and vulnerability-management experience.","Experience in regulated environments.","Relevant security certification or equivalent experience."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.","Hybrid or client-site attendance varies by engagement and is confirmed before assignment."]'::jsonb, 'London-based with UK client-site collaboration where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'cyber-security'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-SEC-004', 'cloud-security-engineer', 'Cloud Security Engineer', 'Engineer preventive and detective security controls across cloud identity, networking, workloads, data and delivery pipelines.', 'The Cloud Security Engineer will work with platform and application teams to embed enforceable cloud security controls into architecture and delivery.',
    'London, UK', 'hybrid', 'full_time', '5–9 years',
    '["Azure Security","AWS Security","IAM","Terraform","CSPM","SIEM","Kubernetes Security","DevSecOps"]'::jsonb, '["Banking & Finance","Media","Education","Automotive"]'::jsonb, '["Define cloud security baselines for identity, network, data and workload controls.","Implement or review policy-as-code and infrastructure-security checks.","Support CSPM, vulnerability and cloud logging integration.","Review cloud architecture and threat scenarios.","Partner with DevOps teams on secure pipelines and secrets management."]'::jsonb, '["5–9 years of cyber-security, cloud-security or platform-security experience.","Strong Azure or AWS security knowledge.","Practical IAM, networking and infrastructure-as-code experience."]'::jsonb,
    '["Kubernetes/container-security experience.","Terraform and DevSecOps experience.","Cloud-security certification where relevant."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.","Hybrid or client-site attendance varies by engagement and is confirmed before assignment."]'::jsonb, 'London-based with UK client-site collaboration where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'cyber-security'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-SUP-002', 'technical-customer-support-specialist', 'Technical Customer Support Specialist', 'Provide structured technical assistance to customers and users across software, account, connectivity and application issues with clear ownership and communication.', 'The Technical Customer Support Specialist will diagnose user issues, provide first-line technical guidance and route complex incidents with useful evidence.',
    'London, UK', 'hybrid', 'full_time', '3–5 years',
    '["ITSM","CRM","Windows","Microsoft 365","REST/API Basics","SQL Basics","Remote Support","Knowledge Base"]'::jsonb, '["Education","Professional Services","Media"]'::jsonb, '["Handle customer technical enquiries by phone, email and approved digital channels.","Troubleshoot account, application, browser, connectivity and configuration issues.","Document incidents accurately and maintain customer communication through resolution.","Escalate issues with logs, screenshots and reproducible evidence.","Contribute to knowledge articles and recurring-issue analysis."]'::jsonb, '["3–5 years of technical customer support, helpdesk or service-desk experience.","Strong written and verbal communication skills.","Good understanding of desktop, browser, SaaS and basic network troubleshooting."]'::jsonb,
    '["ITIL or service-management exposure.","Experience with CRM/ITSM platforms.","Basic SQL, API or cloud-service troubleshooting knowledge."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.","Hybrid or client-site attendance varies by engagement and is confirmed before assignment."]'::jsonb, 'London-based with UK client-site collaboration where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'it-support-services'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-SUP-003', 'technical-call-centre-executive', 'Call Centre Executive – Technical Support', 'Support customers through high-quality inbound and outbound technical conversations, structured issue capture and clear hand-off to specialist support teams.', 'The Call Centre Executive – Technical Support will combine customer-service discipline with practical technical triage and accurate ticket ownership.',
    'London, UK', 'hybrid', 'full_time', '3–5 years',
    '["CRM","ITSM","VoIP / Contact Centre","Microsoft 365","Ticketing","Knowledge Base"]'::jsonb, '["Education","Professional Services","Media"]'::jsonb, '["Handle inbound and approved outbound customer-support calls professionally.","Capture identity, issue, urgency and environment details accurately.","Resolve supported first-line issues using approved knowledge and troubleshooting procedures.","Create and route tickets with complete notes and follow-up expectations.","Maintain service quality, privacy and communication standards."]'::jsonb, '["3–5 years of customer service, call-centre or technical-support experience.","Strong spoken and written English with professional telephone etiquette.","Ability to follow technical troubleshooting and escalation procedures consistently."]'::jsonb,
    '["Technology, SaaS, education or IT-service support experience.","CRM/ITSM and contact-centre platform experience.","Additional language capability relevant to business needs."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.","Hybrid or client-site attendance varies by engagement and is confirmed before assignment."]'::jsonb, 'London-based with UK client-site collaboration where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'it-support-services'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-SUP-004', 'technical-support-team-lead', 'Technical Support Team Lead', 'Lead technical support operations, escalation quality, service performance and team development across customer and application-support workflows.', 'The Technical Support Team Lead will coordinate service-desk and application-support activity while driving consistent ownership and continuous improvement.',
    'London, UK', 'hybrid', 'full_time', '6–9 years',
    '["ITSM","ServiceNow","Jira Service Management","Monitoring","SQL","Incident Management","Problem Management"]'::jsonb, '["Banking & Finance","Education","Professional Services"]'::jsonb, '["Manage support queues, priorities, escalations and team workload.","Review incident quality, service metrics and recurring problem patterns.","Coach support staff and maintain knowledge and runbook standards.","Coordinate with engineering and client teams on major incidents and releases.","Drive service-improvement actions to measurable closure."]'::jsonb, '["6–9 years of IT support or service-management experience, including team leadership.","Strong incident, escalation and stakeholder-management capability.","Experience with ITSM tooling and operational reporting."]'::jsonb,
    '["ITIL certification or equivalent service-management experience.","Application-support or cloud-support background.","Experience leading client-facing support teams."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.","Hybrid or client-site attendance varies by engagement and is confirmed before assignment."]'::jsonb, 'London-based with UK client-site collaboration where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'it-support-services'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-HR-001', 'technical-recruiter', 'Technical Recruiter', 'Source, assess and coordinate technology candidates across software, cloud, data, cyber security, QA and support roles with role-specific screening discipline.', 'The Technical Recruiter will manage vacancy intake, sourcing, screening and candidate coordination for approved RC technology positions.',
    'London, UK', 'hybrid', 'full_time', '3–6 years',
    '["ATS","LinkedIn Recruiter","Job Boards","Interview Coordination","Technical Screening","Recruitment Analytics"]'::jsonb, '["Technology Consulting","Banking & Finance","Automotive","Education"]'::jsonb, '["Translate approved role requirements into sourcing and screening criteria.","Source candidates across relevant channels and maintain accurate ATS records.","Conduct structured recruiter screens covering experience, location, availability and role fit.","Coordinate interviews and candidate communication.","Track pipeline quality and recruitment metrics without making unapproved employment promises."]'::jsonb, '["3–6 years of technical recruitment or technology staffing experience.","Strong understanding of common software, cloud, data, QA and infrastructure role families.","Professional candidate communication and recruitment-process discipline."]'::jsonb,
    '["Experience recruiting for UK technology roles.","ATS and LinkedIn Recruiter experience.","Experience supporting client-aligned or consulting recruitment."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.","Hybrid or client-site attendance varies by engagement and is confirmed before assignment."]'::jsonb, 'London-based with UK client-site collaboration where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'talent-acquisition'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-HR-002', 'senior-technical-recruiter', 'Senior Technical Recruiter', 'Lead complex technology hiring across scarce skill areas, improve recruitment quality and partner with delivery leadership on workforce planning and candidate pipelines.', 'The Senior Technical Recruiter will manage priority technical hiring and improve intake, sourcing, assessment and candidate-experience standards.',
    'London, UK', 'hybrid', 'full_time', '6–10 years',
    '["ATS","LinkedIn Recruiter","Talent Mapping","Recruitment Analytics","Workforce Planning","Interview Governance"]'::jsonb, '["Technology Consulting","Banking & Finance","Automotive","Education"]'::jsonb, '["Lead hiring for senior and specialist technology roles.","Advise hiring managers on realistic skill profiles and market constraints.","Build talent maps and proactive pipelines for recurring capability needs.","Review screening quality, interview flow and candidate communication.","Mentor recruiters and improve recruitment reporting and governance."]'::jsonb, '["6–10 years of technology recruitment experience, including senior or specialist hiring.","Strong knowledge of software, cloud, data, cyber security and engineering role markets.","Demonstrated stakeholder-management and recruitment-process leadership."]'::jsonb,
    '["UK consulting or professional-services recruitment experience.","Experience with workforce planning and recruitment analytics.","Team mentoring or recruitment-lead experience."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.","Hybrid or client-site attendance varies by engagement and is confirmed before assignment."]'::jsonb, 'London-based with UK client-site collaboration where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'talent-acquisition'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-AI-001', 'machine-learning-engineer', 'Machine Learning Engineer', 'Build production machine-learning services and pipelines that connect validated models to reliable software, data and operational controls.', 'The Machine Learning Engineer will bridge data science and production engineering by packaging, deploying and operating ML capabilities.',
    'London, UK', 'hybrid', 'full_time', '4–8 years',
    '["Python","PyTorch","scikit-learn","MLflow","Databricks","Docker","Kubernetes","Azure ML / SageMaker"]'::jsonb, '["Banking & Finance","Automotive","Media","Education"]'::jsonb, '["Implement model-training and inference pipelines.","Build APIs, batch or event-driven model-serving integrations.","Automate testing, versioning, deployment and monitoring for ML workloads.","Partner with data scientists on evaluation and reproducibility.","Improve performance, cost, security and production reliability."]'::jsonb, '["4–8 years of software, data or machine-learning engineering experience.","Strong Python and practical ML framework experience.","Experience deploying models into production environments."]'::jsonb,
    '["MLflow, Databricks, Azure ML or SageMaker experience.","Docker/Kubernetes and CI/CD experience.","Feature-store, streaming or real-time inference experience."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.","Hybrid or client-site attendance varies by engagement and is confirmed before assignment."]'::jsonb, 'London-based with UK client-site collaboration where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'artificial-intelligence'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-AI-002', 'mlops-engineer', 'MLOps Engineer', 'Engineer repeatable model deployment, evaluation, monitoring and lifecycle controls for machine-learning and AI services.', 'The MLOps Engineer will establish production controls around model versioning, deployment, monitoring, rollback and infrastructure automation.',
    'London, UK', 'hybrid', 'full_time', '5–9 years',
    '["MLflow","Azure ML","SageMaker","Databricks","Docker","Kubernetes","Terraform","CI/CD","Observability"]'::jsonb, '["Banking & Finance","Automotive","Media","Professional Services"]'::jsonb, '["Build CI/CD pipelines for model and inference-service releases.","Implement model registry, versioning and environment promotion controls.","Configure monitoring for model quality, drift, latency and infrastructure health.","Automate infrastructure and deployment patterns.","Support rollback, incident response and lifecycle governance."]'::jsonb, '["5–9 years of DevOps, platform, data or ML engineering experience with production ML exposure.","Strong cloud, containers, CI/CD and infrastructure-automation capability.","Understanding of model lifecycle, evaluation and operational monitoring."]'::jsonb,
    '["MLflow, Databricks, Azure ML or SageMaker experience.","Kubernetes and Terraform expertise.","Experience supporting regulated AI workloads."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.","Hybrid or client-site attendance varies by engagement and is confirmed before assignment."]'::jsonb, 'London-based with UK client-site collaboration where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'artificial-intelligence'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-CLOUD-002', 'cloud-solutions-architect', 'Cloud Solutions Architect', 'Define secure, resilient and cost-aware cloud architectures and migration roadmaps across application, data and integration workloads.', 'The Cloud Solutions Architect will lead current-state assessment, target architecture and implementation governance for cloud transformation programmes.',
    'London, UK', 'hybrid', 'full_time', '8–12 years',
    '["Azure","AWS","GCP","Terraform","Kubernetes","Networking","IAM","Observability","FinOps"]'::jsonb, '["Banking & Finance","Media","Education","Automotive"]'::jsonb, '["Define landing-zone, network, identity, security and workload architecture.","Assess migration, replatform and refactor options by workload.","Review resilience, observability, cost and operational-readiness requirements.","Guide platform and application teams through architecture decisions.","Document transition roadmaps, risks and architecture standards."]'::jsonb, '["8–12 years of cloud, infrastructure or solution-architecture experience.","Deep knowledge of at least one major cloud platform and enterprise networking/IAM.","Experience leading cloud migration or modernisation programmes."]'::jsonb,
    '["Azure/AWS/GCP architecture certification.","Kubernetes, Terraform and landing-zone experience.","FinOps and SRE knowledge."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.","Hybrid or client-site attendance varies by engagement and is confirmed before assignment."]'::jsonb, 'London-based with UK client-site collaboration where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'cloud-and-infrastructure'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-RISK-001', 'risk-compliance-analyst', 'Risk & Compliance Analyst', 'Support operational and technology risk assessment, control mapping, evidence review and remediation tracking across enterprise environments.', 'The Risk & Compliance Analyst will help translate policy, control and operational requirements into practical evidence and tracked remediation.',
    'London, UK', 'hybrid', 'full_time', '3–6 years',
    '["GRC","Risk Registers","Control Testing","Excel / Power BI","Jira","Policy Mapping","Audit Evidence"]'::jsonb, '["Banking & Finance","Education","Professional Services"]'::jsonb, '["Maintain risk and control registers with accountable owners.","Map controls to operating processes and evidence sources.","Support control testing and remediation follow-up.","Prepare risk reporting and management information.","Coordinate evidence requests across technology and business teams."]'::jsonb, '["3–6 years of risk, compliance, audit or controls experience.","Strong documentation, analytical and stakeholder-coordination skills.","Understanding of technology and operational-risk concepts."]'::jsonb,
    '["Financial-services or regulated-environment experience.","GRC platform experience.","Relevant risk, audit or compliance certification."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.","Hybrid or client-site attendance varies by engagement and is confirmed before assignment."]'::jsonb, 'London-based with UK client-site collaboration where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'risk-and-management-consulting'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-SUST-001', 'sustainability-consultant', 'Sustainability Consultant', 'Help organisations translate sustainability objectives into measurable roadmaps, data requirements, operating changes and technology-enabled improvement initiatives.', 'The Sustainability Consultant will support strategy, data and change activities that connect sustainability goals to accountable operational delivery.',
    'London, UK', 'hybrid', 'full_time', '4–8 years',
    '["ESG Reporting","Data Analysis","Power BI","Process Mapping","Programme Delivery","Sustainability Metrics"]'::jsonb, '["Automotive","Professional Services","Education"]'::jsonb, '["Assess sustainability priorities, current initiatives and data availability.","Define roadmap, measures, owners and implementation dependencies.","Support sustainability reporting-data design and quality review.","Coordinate change and adoption activities across stakeholders.","Track delivery progress and evidence against agreed outcomes."]'::jsonb, '["4–8 years of sustainability, transformation, ESG, operations or management-consulting experience.","Strong analytical and stakeholder-management capability.","Ability to structure measurable initiatives and implementation roadmaps."]'::jsonb,
    '["ESG reporting or sustainability-data experience.","Technology-efficiency or cloud-optimisation exposure.","Relevant sustainability qualification where applicable."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.","Hybrid or client-site attendance varies by engagement and is confirmed before assignment."]'::jsonb, 'London-based with UK client-site collaboration where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'sustainability'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-EDU-002', 'education-technology-consultant', 'Education Technology Consultant', 'Advise education organisations on digital service design, student and staff workflows, platform requirements, accessibility and implementation planning.', 'The Education Technology Consultant will combine education-process understanding with technology advisory and delivery planning.',
    'London, UK', 'hybrid', 'full_time', '4–8 years',
    '["Education MIS","CRM","Student Portals","Workflow Platforms","Data Integration","WCAG","Reporting"]'::jsonb, '["Education"]'::jsonb, '["Map learner, staff and administrative journeys.","Define portal, workflow, integration and reporting requirements.","Support solution evaluation and implementation planning.","Address accessibility, privacy and role-based access requirements.","Coordinate stakeholder workshops and adoption activities."]'::jsonb, '["4–8 years of education technology, digital transformation or education-consulting experience.","Strong requirements, process and stakeholder-management capability.","Understanding of education systems, data and digital-service delivery."]'::jsonb,
    '["Education MIS, CRM or student-portal experience.","WCAG/accessibility knowledge.","Experience supporting education-sector implementation programmes."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.","Hybrid or client-site attendance varies by engagement and is confirmed before assignment."]'::jsonb, 'London-based with UK client-site collaboration where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'education-technology'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-AUTO-002', 'automotive-software-engineer', 'Automotive Software Engineer', 'Develop connected-product, integration and backend software for automotive and mobility programmes with strong reliability and observability requirements.', 'The Automotive Software Engineer will build services and integrations that connect vehicle-related data, digital applications and enterprise platforms.',
    'London, UK', 'hybrid', 'full_time', '4–8 years',
    '["Java / .NET","REST APIs","Kafka","MQTT","Azure / AWS","SQL","Docker","Observability"]'::jsonb, '["Automotive"]'::jsonb, '["Develop APIs and backend services for automotive workflows.","Implement event-driven integrations and data contracts.","Build automated tests and production telemetry.","Support integration troubleshooting across multiple system owners.","Document interface ownership and failure-handling behaviour."]'::jsonb, '["4–8 years of backend, integration or platform-engineering experience.","Strong Java, .NET or comparable backend development skills.","Experience with APIs, messaging and distributed systems."]'::jsonb,
    '["Automotive, telematics or connected-product experience.","Kafka/MQTT and cloud-platform experience.","High-volume event-processing experience."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.","Hybrid or client-site attendance varies by engagement and is confirmed before assignment."]'::jsonb, 'London-based with UK client-site collaboration where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'automotive-technology'
  on conflict (slug) do nothing;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details, status,
    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at
  )
  select
    c.id, 'RC-MEDIA-001', 'media-platform-engineer', 'Media Platform Engineer', 'Build and operate scalable digital media, content and communication platforms with reliable integrations, performance and observability.', 'The Media Platform Engineer will support content, audience and distribution workflows across cloud-hosted digital platforms.',
    'London, UK', 'hybrid', 'full_time', '4–8 years',
    '["Node.js / Java / .NET","APIs","Cloud","CDN","Event Streaming","SQL/NoSQL","Docker","Observability"]'::jsonb, '["Media"]'::jsonb, '["Develop backend services and platform integrations for content workflows.","Improve performance, caching, resilience and observability.","Support event-driven integrations and metadata flows.","Automate deployment and production health checks.","Investigate platform failures and recurring operational issues."]'::jsonb, '["4–8 years of backend, cloud or platform-engineering experience.","Strong API and distributed-system fundamentals.","Experience operating high-traffic or content-heavy digital services."]'::jsonb,
    '["Media, streaming, publishing or communication-platform experience.","CDN and event-streaming knowledge.","Cloud-native and container-platform experience."]'::jsonb, '["Compensation, leave, pension and any role-specific benefits are confirmed during the recruitment process and stated in the written offer.","Any client-site, travel, security-screening or right-to-work requirements are confirmed before appointment."]'::jsonb, '["Work is organised around defined delivery outcomes, documented responsibilities, peer review and clear escalation paths.","Hybrid or client-site attendance varies by engagement and is confirmed before assignment."]'::jsonb, 'London-based with UK client-site collaboration where required.',
    'published', '2026-09-08T00:00:00Z', '2026-09-08T00:00:00Z', null, null, v_admin_id, v_admin_id, 1,
    coalesce('2026-09-08T00:00:00Z'::timestamptz, now()), now()
  from public.job_categories c
  where c.slug = 'media-and-communication-technology'
  on conflict (slug) do nothing;


  insert into public.audit_logs (admin_id, action, entity_type, entity_id, after_data, metadata)
  select v_admin_id, 'job_catalog_migrated', 'job', j.id, to_jsonb(j),
         jsonb_build_object('source', 'phase_11_legacy_catalog_migration')
  from public.jobs j
  where j.slug = any (array['senior-data-engineer', 'data-bi-engineer', 'senior-dotnet-full-stack-engineer', 'java-microservices-engineer', 'cloud-platform-engineer', 'devops-sre-engineer', 'cyber-security-engineer', 'qa-automation-engineer', 'application-support-engineer', 'technical-business-analyst', 'technical-delivery-manager', 'automotive-integration-engineer', 'education-platform-engineer', 'data-engineer', 'lead-data-engineer', 'data-analyst', 'senior-data-analyst', 'data-scientist', 'senior-data-scientist', 'database-designer-data-modeler', 'senior-database-architect', 'analytics-engineer', 'data-platform-architect', 'business-analyst', 'senior-business-analyst', 'qa-engineer', 'senior-qa-automation-engineer', 'data-warehouse-engineer', 'senior-data-warehouse-engineer', 'etl-developer', 'soc-analyst', 'senior-cyber-security-analyst', 'cloud-security-engineer', 'technical-customer-support-specialist', 'technical-call-centre-executive', 'technical-support-team-lead', 'technical-recruiter', 'senior-technical-recruiter', 'machine-learning-engineer', 'mlops-engineer', 'cloud-solutions-architect', 'risk-compliance-analyst', 'sustainability-consultant', 'education-technology-consultant', 'automotive-software-engineer', 'media-platform-engineer']::text[])
    and not exists (
      select 1 from public.audit_logs a
      where a.entity_type = 'job' and a.entity_id = j.id and a.action = 'job_catalog_migrated'
    );
end $$;
