# HireFit AI 🤖

### AI-Powered Resume Analyzer & Job Matching Platform

HireFit AI is an intelligent career platform that helps job seekers analyze their resumes, evaluate ATS compatibility, compare resumes against job descriptions, and generate detailed AI-powered match reports.

The platform combines resume analysis, ATS scoring, job-description matching, personalized recommendations, and report generation into a single application.

---

## 🚀 Features

### 📄 Resume Analyzer

Upload a resume and receive an AI-powered analysis covering:

- Resume quality assessment
- ATS compatibility
- Skills extraction
- Strengths and weaknesses
- Improvement recommendations
- Resume summary
- Structured analysis results

---

### 🎯 AI Job Match

Compare your resume against a specific Job Description and receive:

- AI Match Score
- ATS Compatibility Score
- Matched Skills
- Missing Skills
- Strengths
- Recommendations
- AI-generated summary

The matching pipeline uses the analyzed resume and Job Description to generate a structured compatibility report.

---

### 💼 Job Description Library

Save frequently used Job Descriptions for future matching.

Users can:

- Save Job Descriptions
- View saved JDs
- Load a JD into the matching workflow
- Edit saved JDs
- Delete saved JDs
- Reuse saved JDs without entering them again

---

### 📊 Match Report History

Previous AI match reports are stored against the relevant resume analysis.

Users can:

- View previous match reports
- Restore previous reports
- Review historical scores
- Re-export previous reports
- Reuse saved Job Descriptions

Each match is linked to its corresponding resume analysis to keep report history organized.

---

### 📑 Export Reports

Generate downloadable DOCX reports containing:

- Match Score
- ATS Compatibility
- Matched Skills
- Missing Skills
- Strengths
- Recommendations
- Resume Summary
- Report dates

Reports can be exported directly from the application.

---

### 🔐 Authentication & Authorization

HireFit AI includes account-based access control.

Features include:

- User authentication
- Protected dashboard routes
- Admin-only routes
- Role-based access control
- Password reset flow
- User isolation
- Cross-account data protection

A user's resume analyses, Job Descriptions, and match reports cannot be accessed by another user.

---

### 🛡️ Admin Console

Administrators have access to a dedicated admin dashboard.

Admin functionality includes:

- User management
- Role management
- Resume analysis overview
- Analytics
- User activity information
- Admin settings

The admin interface is protected separately from normal user routes.

---

## 🧠 AI Pipeline

HireFit AI uses a server-side Gemini-powered pipeline for resume analysis and job matching.

### Resume Analysis

```text
Resume Upload
      ↓
Resume Text Extraction
      ↓
AI Analysis
      ↓
Structured Resume Analysis
      ↓
Firestore
      ↓
Dashboard