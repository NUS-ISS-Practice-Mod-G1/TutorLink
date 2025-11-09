# TutorLink Security Policy

Welcome to the TutorLink project!  
This document explains how we manage vulnerabilities, what to test responsibly, and how to report issues.

---

## Reporting a Vulnerability

If you discover a potential vulnerability, **please report it privately**.

### Contact Options
- **security@tutorlink.dev**
- You may also use the **“Report a vulnerability”** feature on the GitHub repository.

**Please do not open a public GitHub Issue or Discussion** for security concerns.

When reporting:
- Provide a clear description of the issue and its potential impact.
- Include steps to reproduce, relevant logs, or proof-of-concept (PoC).
- If you believe it affects user data, describe scope and risk briefly.

We acknowledge receipt within **48 hours** and aim to provide an initial assessment within **5 business days**.

---

## Coordinated Disclosure

We follow a **responsible disclosure** approach:

1. Acknowledge and verify the issue.
2. Develop and test a patch.
3. Coordinate with the reporter to release fixes.
4. Publish an advisory (via GitHub Security Advisory) once remediated.

If active exploitation is detected, we may expedite the patch and advisory process.

---

## Scope

**In Scope**
- Backend (Spring Boot) and Frontend (React) code within this repository.
- GitHub Actions workflows (`pipeline.yml`, `deploy.yml`).
- API endpoints deployed under official TutorLink domains.

**Out of Scope**
- Third-party services or APIs outside our control.
- Attacks that require physical access or social engineering.
- DoS attacks without a reproducible software defect.

---

## Supported Versions

| Branch / Tag | Support | Notes |
|---------------|----------|-------|
| `main` | Fully supported | Production |
| `develop` | Best-effort | Active development |

---

## Our Security Pipeline

TutorLink uses a **defense-in-depth** CI/CD pipeline to detect vulnerabilities early:

| Category | Tools / Actions | Enforcement |
|-----------|-----------------|-------------|
| **Secret Scanning** | TruffleHog / Gitleaks | PRs & pushes |
| **Static Analysis (SAST)** | GitHub CodeQL (`javascript`, `java`) | Required before merge |
| **Dependency Scanning (SCA)** | OWASP Dependency-Check (backend), `npm audit` (frontend), Trivy (image + FS) | Fails build on HIGH/CRITICAL |
| **Container Security** | Trivy + multi-stage non-root builds | Mandatory |
| **Dynamic Testing (DAST)** | OWASP ZAP baseline scans on staging | Required post-deploy |
| **Performance & Reliability** | Apache JMeter tests | Post-deploy sanity checks |
| **AI Summary** | Gemini AI generates post-deployment analysis of ZAP & JMeter results | For visibility |
| **Coverage Reporting** | Codecov (with token protection) | Informational only |
| **Approvals** | Environment-based reviewers (QA → Product Owner) | Required for staging & prod |
| **Artifact Integrity** | Trivy scans + digest pinning (in progress) | Roadmap |

---

## Responsible Testing Guidelines

We encourage good-faith research and testing.

**Permitted:**
- Local testing with your own accounts or dummy data.
- Using dev/staging endpoints (if provided) for fuzz or scan testing.
- Reporting suspected misconfigurations or secrets exposure.

**Not Permitted:**
- Exploiting vulnerabilities beyond proof-of-concept.
- Testing against production data or real users.
- Social engineering, spam, or denial-of-service attacks.

Follow the principle of **“Do No Harm.”**

We offer *Safe Harbor* for researchers acting in good faith:
> If you test responsibly, avoid privacy violations, and report promptly, we will not pursue legal action.

---

## Incident Response & Patch Process

| Step | Target SLA |
|------|-------------|
| **Acknowledgement** | ≤ 48 hours |
| **Initial Assessment** | ≤ 5 business days |
| **Fix / Patch** | Critical: ≤ 48h • High: ≤ 5d • Medium: ≤ 10d |
| **Advisory Published** | After patch release |
| **Reporter Credit** | Optional, upon consent |

---

## Maintainers’ Hardening Checklist

- [ ] No secrets committed, echoed, or stored in repo artifacts.
- [ ] Actions pinned to **commit SHAs**.
- [ ] Job permissions minimized (`contents: read` by default).
- [ ] Trivy scans **fail build** on HIGH/CRITICAL vulnerabilities.
- [ ] `application.yml` and `.env` files created securely, not stored long-term.
- [ ] SSH/SCP deploys use verified host fingerprints.
- [ ] Branch protections enforce CI checks & approvals.
- [ ] JWT secrets rotated and stored in GitHub Secrets.
- [ ] Dependency updates reviewed (Dependabot enabled).
- [ ] Blue/Green or canary deployment ready for rollback.

---


