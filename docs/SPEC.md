# DIT Engineering Project Discovery Platform
## Frontend-Only Product Prototype & Validation Specification

## 1. Project Overview

Build a modern web platform designed initially for students at the Dar es Salaam Institute of Technology (DIT) to discover, explore, compare, and evaluate engineering final-year project ideas.

The platform addresses a recurring problem faced by final-year students: selecting a project that is relevant, technically meaningful, sufficiently original, and different from projects that have already been attempted by previous students.

Currently, students may need to inspect project-title documents containing accepted and rejected project titles from multiple academic years. This process is difficult because:

- There may be many students and project titles.
- Project information is distributed across different documents and years.
- Students must manually search through documents.
- Similar projects may use different wording.
- Students may know a real-world problem but not know whether previous students have already attempted to solve it.
- Students may have a project idea but lack awareness of related engineering problems.
- A project may look different by title while actually addressing the same problem.
- A project may be similar to an existing project but still contain a meaningful improvement or new contribution.

The proposed platform transforms this document-based process into an easy-to-use engineering project discovery and knowledge platform.

The long-term vision is not simply to create a database of project titles. The platform should help students understand:

> Existing engineering problems → previous solutions → related projects → technology used → opportunities for improvement and innovation.

---

# 2. Core Product Vision

The central product philosophy is:

> Don't just help students find project titles. Help them understand engineering problems, existing solutions, and opportunities for innovation.

The platform should encourage students to think like engineers rather than simply search for a project title to copy.

Instead of asking:

> "What project can I copy?"

the platform should help a student ask:

> "What real engineering problem exists, what solutions have already been attempted, and how can I develop a better or different solution?"

---

# 3. Initial Development Strategy

This project is currently in the TESTING / PRODUCT VALIDATION stage.

Do NOT build the backend yet.

The first implementation must be:

- Frontend only
- React + Vite
- TypeScript
- Local structured data
- No production database
- No backend API
- No authentication
- No server-side processing

The purpose of this phase is to understand:

1. How students interact with the platform.
2. Which features students actually use.
3. How students search for projects.
4. How students explore problems.
5. Which filters are useful.
6. Whether project similarity is useful.
7. Whether project comparison is useful.
8. Whether students understand the information architecture.
9. What students expect from the platform.
10. What additional features should be built before introducing a backend.

The frontend prototype should behave as realistically as possible even though all data is stored locally.

---

# 4. Important Development Principle

Although the application is frontend-only, its data structure and component architecture should be designed as if a backend will eventually exist.

The future architecture should be able to replace:

```text
Local TypeScript / JSON data
```

with:

```text
REST API / Backend
        ↓
Database
```

without requiring a complete redesign of the frontend.

Therefore:

- Keep data models clean.
- Use unique IDs.
- Avoid hardcoding project information directly inside UI components.
- Keep search/filter/similarity logic separate from presentation.
- Create reusable components.
- Separate data, business logic, and UI.
- Use typed interfaces/models.
- Design reusable service functions that can later be replaced with API calls.

---

# 5. Target Users

## Primary Users

### Final-Year Students

Students who need to:

- find project ideas
- investigate existing projects
- avoid unintentionally duplicating previous work
- discover engineering problems
- identify related technologies
- compare existing projects
- understand project trends

## Secondary Users

### Engineering Students

Students in earlier years can use the platform to explore engineering problems and begin thinking about future projects.

### Supervisors

Potential future users who may use the platform to:

- review previous projects
- identify repeated topics
- evaluate project originality
- understand project trends

### Departments / Institution

Potential future users who may use aggregated project information for:

- project management
- academic planning
- identifying research trends
- preserving institutional knowledge

---

# 6. Main User Problem

The current workflow is approximately:

```text
Student has project idea
        ↓
Searches old documents
        ↓
Checks project titles manually
        ↓
Searches another year
        ↓
Searches another document
        ↓
Tries to determine similarity manually
        ↓
May miss an existing project
        ↓
May propose a project that has already been attempted
```

The proposed workflow should become:

```text
Student enters the platform
        ↓
Searches / explores a problem
        ↓
Filters by engineering programme/year/category
        ↓
Views relevant projects
        ↓
Examines previous solutions
        ↓
Checks similar projects
        ↓
Compares projects
        ↓
Identifies opportunities for improvement
        ↓
Develops a more informed project proposal
```

---

# 7. Core Product Sections

The initial platform should contain the following major sections:

```text
HOME
PROJECTS
PROBLEMS
ENGINEERING FIELDS
COMPARE
INSIGHTS
```

Future sections may include:

```text
PROJECT IDEA EXPLORER
SIMILARITY CHECKER
AI PROJECT DISCOVERY
```

These future features should not be over-engineered in the first prototype.

---

# 8. Homepage

The homepage should be simple, modern, professional, and highly focused on discovery.

The primary element should be a large search bar.

Example conceptual layout:

```text
--------------------------------------------------
        DIT ENGINEERING PROJECT HUB

        Discover. Compare. Innovate.

  [ Search projects, problems, technologies... ]

  [Programme] [Category] [Year] [Status]

        Explore Engineering
--------------------------------------------------

  1,248 Projects       37 Categories
  8 Programmes         2019–2026

--------------------------------------------------

        Explore by Engineering Discipline

 Electrical Engineering
 Mechanical Engineering
 Civil Engineering
 Electronics & Telecommunications
 Computer Engineering
 Information Technology
 Automotive Engineering

--------------------------------------------------

        Explore Engineering Problems

 Agriculture
 Energy
 Water
 Manufacturing
 Transportation
 Healthcare
 Construction
 Environment
 Automation
 Security

--------------------------------------------------
```

The exact numbers above are placeholders and must be generated from the actual local dataset.

Do not hardcode statistics.

---

# 9. Search System

The search system is one of the most important features.

Search should not only search project titles.

It should search across multiple fields.

Potential searchable fields:

- project title
- problem title
- problem description
- solution
- programme
- engineering domain
- category
- technology
- application area
- student name where appropriate
- year
- keywords

Example:

Student searches:

```text
water
```

The application should be able to return projects involving:

- water monitoring
- irrigation
- water pumping
- water treatment
- water leakage
- water flow control
- tank level monitoring
- smart water meters

The user may not know the exact terminology used by previous students.

Therefore, search should support keyword matching across multiple project attributes.

---

# 10. Search Behavior

Search results should update quickly without page reloads.

The interface should clearly communicate:

- number of matching projects
- active filters
- search query
- ability to clear filters
- sorting options

Potential sorting options:

- relevance
- newest
- oldest
- alphabetical
- most related

For the prototype, relevance can be based on simple frontend scoring.

---

# 11. Filtering System

The Projects page should support multiple filters.

Required initial filters:

### Programme

Examples:

- Electrical Engineering
- Mechanical Engineering
- Civil Engineering
- Electronics and Telecommunications
- Computer Engineering
- Information Technology
- Automotive Engineering

The exact programme list should come from the local data.

### Year

Example:

```text
2019
2020
2021
2022
2023
2024
2025
2026
```

### Project Status

Example:

```text
Accepted
Rejected
Revised
Resubmitted
Unknown
```

### Project Stage

Example:

```text
Proposed
Approved
In Progress
Completed
Unknown
```

### Engineering Domain

Examples:

```text
Automation & Control
Power Systems
Renewable Energy
Electronics
Software
Communication
Manufacturing
Structural Engineering
Transportation
Water Systems
```

### Category

Examples:

```text
Agriculture
Energy
Water
Healthcare
Manufacturing
Environment
Transportation
Security
Construction
Industrial Processes
```

### Technology

Examples:

```text
PLC
IoT
Arduino
ESP32
Sensors
Servo Motor
SCADA
Solar PV
Machine Learning
Computer Vision
Embedded Systems
Mobile Applications
```

The system should support multiple filters simultaneously.

---

# 12. Project Data Model

The local data should use a standardized project structure.

Example TypeScript model:

```ts
interface Project {
  id: string;
  title: string;
  standardizedTitle: string;

  year: number;

  programme: string;

  status:
    | "accepted"
    | "rejected"
    | "revised"
    | "resubmitted"
    | "unknown";

  projectStage:
    | "proposed"
    | "approved"
    | "in-progress"
    | "completed"
    | "unknown";

  problem: {
    title: string;
    description: string;
  };

  solution: {
    summary: string;
  };

  engineeringDomains: string[];

  categories: string[];

  technologies: string[];

  applicationAreas: string[];

  students: {
    id: string;
    name: string;
  }[];

  supervisor?: string;

  keywords: string[];

  source?: {
    year: number;
    documentName: string;
  };
}
```

The model may be adjusted during implementation, but it should remain structured and future-backend-friendly.

---

# 13. Original vs Standardized Project Titles

Historical documents may contain inconsistent formatting.

For example:

```text
DESIGN OF AUTOMATIC WATER SYSTEM
Design and implementation of automatic water system
Automatic Water System Design
```

The dataset should support:

```text
originalTitle
standardizedTitle
```

Do not destroy the original historical information.

The standardized title is used for cleaner display and search.

The original title may be preserved for traceability.

---

# 14. Problems Explorer

Create a dedicated section called:

```text
Explore Problems
```

This section should not focus primarily on project titles.

It should help students discover real-world engineering problems.

Example:

```text
AGRICULTURE

Problems:
- Inefficient irrigation
- Crop monitoring
- Agricultural equipment monitoring
- Storage conditions
- Water consumption

ENERGY

Problems:
- High energy consumption
- Poor power quality
- Energy monitoring
- Renewable energy integration
- Load management

WATER

Problems:
- Water leakage
- Water wastage
- Tank overflow
- Water quality monitoring
- Pumping efficiency
```

The actual problems should come from the dataset.

---

# 15. Problem Detail Page

When a student opens a problem, show:

```text
Problem
Description
Related Engineering Fields
Related Categories
Related Technologies
Previous DIT Projects
Potential Engineering Approaches
```

Example:

```text
PROBLEM:
Inefficient irrigation water usage

DESCRIPTION:
Manual irrigation can result in inconsistent water
distribution and unnecessary water consumption.

RELATED ENGINEERING FIELDS:
Electrical Engineering
Mechanical Engineering
Agricultural Engineering

RELATED TECHNOLOGIES:
Sensors
PLC
IoT
Servo Motors

PREVIOUS PROJECTS:
12 projects found
```

Do not claim that a solution is novel unless there is reliable evidence.

---

# 16. Project Detail Page

Every project should have a dedicated detail page.

Example structure:

```text
AUTOMATIC WATER FLOW CONTROL SYSTEM

2026 · Electrical Engineering · Automation

-----------------------------------------------

PROBLEM

Manual irrigation can result in inefficient
water usage...

-----------------------------------------------

SOLUTION

The project developed an automated system
for controlling water flow...

-----------------------------------------------

ENGINEERING DOMAIN

Automation & Control

APPLICATION

Agriculture

-----------------------------------------------

TECHNOLOGIES

[PLC] [Servo Motor] [Flow Sensor]

-----------------------------------------------

STUDENT(S)

Student Name
Student Name

-----------------------------------------------

STATUS

Accepted

-----------------------------------------------

YEAR

2026

-----------------------------------------------

SIMILAR PROJECTS

Smart Irrigation System — 2024
Automatic Water Pump Control — 2023
IoT Irrigation Monitoring — 2022
```

The page should make the engineering contribution easy to understand.

---

# 17. Similar Projects Feature

This is one of the most important prototype features.

When a student views a project, display related projects.

The first implementation does NOT require AI or machine learning.

Use a deterministic similarity algorithm based on:

- shared categories
- shared technologies
- shared engineering domains
- shared application areas
- matching keywords
- title keyword overlap
- problem keyword overlap

Example:

```text
Project A

Categories:
Water
Agriculture
Automation

Technologies:
PLC
Servo Motor
Sensors

Project B

Categories:
Water
Agriculture
Automation

Technologies:
PLC
Sensors

Similarity: 87%
```

The similarity percentage is an internal prototype metric, not an academic claim.

Clearly label it as:

```text
Similarity score
```

not:

```text
Academic originality score
```

---

# 18. Important Rule About Similarity

Similarity does not automatically mean that a new project should be rejected.

For example:

Previous:

```text
Solar Powered Irrigation System
```

New:

```text
AI-Based Solar Irrigation Optimization Using Predictive Soil Moisture Analysis
```

These projects are related, but the second project may contain a meaningful new contribution.

Therefore the platform should help users understand:

```text
Existing Work
      ↓
Similar Work
      ↓
Differences
      ↓
Potential Improvement
```

The platform should not make final academic approval decisions.

---

# 19. Project Comparison

Allow users to select two or three projects.

Example:

```text
COMPARE PROJECTS

                 Project A       Project B

Year             2023            2025
Programme        Electrical      Electronics
Problem          Water waste     Water monitoring
Solution         Automation      IoT monitoring
Technology       PLC             ESP32
Category         Agriculture     Water
```

The comparison feature should help students identify similarities and differences.

---

# 20. Project Evolution

Where the dataset allows it, display related projects chronologically.

Example:

```text
2021
Automatic Irrigation System
        ↓
2022
Solar Irrigation System
        ↓
2024
IoT Irrigation Monitoring
        ↓
2026
Smart Irrigation + Remote Control
```

This feature should demonstrate that engineering innovation can occur through continuous improvement.

The goal is to teach students:

> Existing work does not always mean the problem is closed.

Students may be able to improve:

- efficiency
- cost
- automation
- reliability
- accuracy
- scalability
- communication
- safety
- energy consumption
- usability

---

# 21. Insights Page

Create an analytics-style page using the local dataset.

Potential information:

### Projects by Year

Show the number of projects conducted each year.

### Projects by Programme

Show project distribution by engineering programme.

### Popular Categories

Show categories with the highest number of projects.

### Popular Technologies

Show technologies frequently used.

### Engineering Problem Trends

Show which problem areas have received the most attention.

### Emerging Areas

Potentially identify areas with increasing activity over time.

All statistics must be calculated from the local dataset.

Do not hardcode statistics.

---

# 22. Project Idea Explorer

This is a future feature, but the prototype may include a simple non-AI version.

A student could select:

```text
Programme:
Electrical Engineering

Interest:
Agriculture

Technology:
IoT
```

The system can return:

```text
Related Problems
Existing Projects
Related Technologies
Potential Areas for Investigation
```

The system should not claim to generate academically approved project titles.

The purpose is discovery, not automatic project approval.

---

# 23. Future AI Capability

AI may eventually be added, but it is NOT required in the first prototype.

Potential future capabilities:

### Semantic Search

Student:

> "I want to reduce electricity consumption in buildings."

System finds projects related to:

- energy monitoring
- smart meters
- automatic lighting
- occupancy detection
- building automation
- load management

### AI Similarity Analysis

Compare a proposed project with historical projects and explain:

- overlapping problem
- overlapping technology
- overlapping application
- major differences
- possible areas of differentiation

### Project Discovery Assistant

Student describes an area of interest and receives:

- relevant problems
- previous projects
- related technologies
- project evolution
- possible research directions

AI should be introduced only after the historical dataset has been cleaned and validated.

---

# 24. Frontend Data Organization

Recommended project structure:

```text
src/
│
├── data/
│   ├── projects.ts
│   ├── problems.ts
│   ├── programmes.ts
│   ├── categories.ts
│   ├── technologies.ts
│   └── engineeringDomains.ts
│
├── pages/
│   ├── Home/
│   ├── Projects/
│   ├── ProjectDetails/
│   ├── Problems/
│   ├── ProblemDetails/
│   ├── Categories/
│   ├── Compare/
│   └── Insights/
│
├── components/
│   ├── SearchBar/
│   ├── FilterPanel/
│   ├── ProjectCard/
│   ├── ProjectTable/
│   ├── ProblemCard/
│   ├── SimilarProjects/
│   ├── ComparisonTable/
│   └── Statistics/
│
├── utils/
│   ├── search.ts
│   ├── filtering.ts
│   ├── similarity.ts
│   ├── sorting.ts
│   └── analytics.ts
│
├── types/
│   └── project.ts
│
└── App.tsx
```

The exact folder organization may change if a better architecture is identified, but separation of concerns is required.

---

# 25. Recommended Technology Stack

## Frontend

- React
- Vite
- TypeScript

## Styling

Use a modern responsive UI system such as:

- Tailwind CSS

or another appropriate component/styling system.

## Routing

- React Router

## State

Initially, avoid unnecessary global state.

Use:

- React state
- URL query parameters where appropriate
- Context only when genuinely needed

A global state library should not be introduced unless the prototype demonstrates a real need.

---

# 26. Responsive Design

The application must work well on:

- desktop
- laptop
- tablet
- mobile

Students may access the platform from phones, so mobile usability is important.

The mobile interface should not simply be a compressed desktop layout.

Prioritize:

- readable project cards
- easy filtering
- accessible search
- clear navigation
- simple project details
- touch-friendly controls

---

# 27. UI/UX Principles

The interface should feel like a modern professional knowledge platform.

Prioritize:

- simplicity
- clarity
- fast discovery
- visual hierarchy
- minimal clutter
- strong typography
- consistent spacing
- responsive design
- clear filtering
- clear project metadata
- obvious navigation

Avoid:

- unnecessary animations
- excessive gradients
- overly complicated dashboards
- too many cards
- decorative elements that reduce usability

The primary objective is information discovery.

---

# 28. Student Behavior Testing

The prototype is also a product research tool.

Do not only ask students whether they like the website.

Observe how they use it.

Important behaviors to study:

```text
Search
Filter
Project opening
Problem exploration
Category exploration
Similar-project interaction
Comparison usage
Return navigation
Search refinement
```

Potential frontend event names:

```text
search_performed
filter_used
project_opened
problem_opened
category_opened
similar_project_clicked
comparison_started
comparison_completed
technology_selected
```

These events can initially be logged locally or simply monitored during testing.

Later, they can be sent to a backend analytics system.

---

# 29. Product Validation Questions

The prototype should help answer:

### Discovery

- Do students start with search or categories?
- Do students understand the purpose of the platform?

### Search

- What words do students use?
- Do they search by project title?
- Do they search by problem?
- Do they search by technology?

### Filtering

- Which filters are actually useful?
- Are there too many filters?
- Which filters should be visible by default?

### Similarity

- Do students understand similarity scores?
- Does seeing similar projects help them modify their ideas?

### Problems

- Are students interested in exploring problems before seeing projects?

### Comparison

- Do students compare projects?
- What information do they compare?

### Navigation

- Can students find relevant information without instruction?

These findings should influence later product development.

---

# 30. Historical Data Collection

The actual historical data will eventually come from existing DIT documents.

Potential years:

```text
2019
2020
2021
2022
2023
2024
2025
2026
```

The actual available years should depend on the documents obtained.

Data should be extracted and standardized.

Potential fields:

```text
Student name
Project title
Programme
Department
Year
Status
Supervisor
Problem
Solution
Category
Engineering domain
Technology
Application area
Source document
```

Do not invent missing information.

If information is unavailable, use:

```text
Unknown
```

rather than guessing.

---

# 31. Data Quality Rules

Historical project data may contain:

- spelling errors
- inconsistent capitalization
- duplicate projects
- inconsistent programme names
- abbreviations
- incomplete titles
- inconsistent terminology

The data-cleaning process should:

1. Preserve original information.
2. Create standardized fields.
3. Remove obvious duplicate records carefully.
4. Normalize programme names.
5. Normalize categories.
6. Normalize technologies.
7. Normalize years.
8. Preserve source information.
9. Never fabricate missing information.

---

# 32. Example Local Dataset

The prototype should include enough realistic sample data to test all features.

Do not use only five or ten projects.

A useful initial prototype dataset should contain approximately:

```text
50–100 projects
```

distributed across multiple:

- programmes
- years
- categories
- engineering domains
- technologies
- statuses

The dataset should intentionally include similar projects so the similarity feature can be tested.

It should also include projects that are related but not identical.

---

# 33. Example Project Relationships

The dataset should include relationships such as:

```text
Project A
Automatic Irrigation System

Project B
Solar Powered Irrigation System

Project C
IoT Irrigation Monitoring System

Project D
Smart Irrigation with Soil Moisture Control
```

These allow the prototype to demonstrate:

- search
- similarity
- comparison
- project evolution
- problem exploration

---

# 34. Prototype Limitations

The frontend prototype must clearly be treated as a testing version.

It is NOT yet:

- an official DIT database
- an academic approval system
- an originality certification system
- a plagiarism detector
- a replacement for supervisors
- an authoritative source for project approval

The platform should not tell students:

> "Your project is original."

Instead, it should say something conceptually similar to:

> "No highly similar project was found in the current dataset."

This distinction is important.

---

# 35. Future Backend Architecture

Do not implement this now, but design the frontend so it can eventually connect to:

```text
React Frontend
        ↓
Backend API
        ↓
PostgreSQL
        ↓
Search / Analytics / AI Services
```

Possible future backend technologies:

- Node.js
- Express or NestJS
- PostgreSQL

Potential future services:

- authentication
- project management
- administrative dashboard
- advanced search
- analytics
- AI similarity
- semantic search
- recommendation engine

---

# 36. Future Admin System

Eventually, an authorized administrator could manage:

- projects
- students
- programmes
- categories
- technologies
- engineering problems
- project statuses
- historical records

Potential workflow:

```text
Admin uploads/imports historical data
        ↓
Data validation
        ↓
Standardization
        ↓
Classification
        ↓
Approval
        ↓
Published project
```

This is intentionally outside the first frontend-only prototype.

---

# 37. Future Institutional Expansion

The first version should focus on DIT.

The long-term architecture could support multiple institutions:

```text
Institution
    ↓
Programme
    ↓
Department
    ↓
Project
```

Potential future expansion:

```text
DIT
University of Dar es Salaam
Ardhi University
University of Dodoma
Other Tanzanian institutions
```

Do not build multi-institution functionality in V1 unless it becomes necessary.

---

# 38. Privacy and Academic Considerations

Before publicly publishing historical student information, determine what information DIT permits the platform to publish.

Potentially public:

- project title
- year
- programme
- engineering category
- problem
- solution summary

Potentially sensitive:

- registration numbers
- personal contact information
- unpublished project documents
- confidential industrial information
- private supervisor information

Do not expose sensitive information unnecessarily.

---

# 39. Development Phases

## Phase 1 — Prototype

Build:

- React + Vite
- TypeScript
- local project data
- homepage
- search
- filters
- project listing
- project detail
- problem explorer
- category explorer
- similar projects
- project comparison
- basic insights

No backend.

---

## Phase 2 — Student Testing

Give the prototype to real students.

Observe:

- search behavior
- navigation
- filters
- project discovery
- similarity usage
- comparison usage
- problems encountered

Collect feedback.

---

## Phase 3 — UX Refinement

Improve the platform based on actual usage.

Remove features that are not useful.

Improve features that students naturally use.

---

## Phase 4 — Historical Dataset

Collect and clean real DIT project documents.

Build a standardized dataset.

---

## Phase 5 — Backend

Introduce:

```text
Database
API
Admin system
Authentication
Data management
```

Replace local data with API data.

---

## Phase 6 — Advanced Intelligence

Introduce:

- semantic search
- AI similarity analysis
- recommendations
- project discovery assistant
- research-gap exploration

---

# 40. Success Criteria for the Prototype

The prototype should be considered successful if students can independently:

1. Find a project using search.
2. Filter projects by programme/year/category.
3. Open and understand a project.
4. Discover related projects.
5. Explore a real-world engineering problem.
6. Compare projects.
7. Understand whether their proposed idea is similar to existing work.
8. Identify potential areas for differentiation.
9. Navigate the system without significant instruction.

The prototype should also provide useful behavioral insights for deciding what to build next.

---

# 41. Final Product Concept

The eventual platform should become more than an archive.

It should function as an:

> Engineering Project Discovery and Knowledge Platform

with the following conceptual flow:

```text
REAL-WORLD PROBLEM
        ↓
ENGINEERING FIELD
        ↓
PREVIOUS PROJECTS
        ↓
EXISTING SOLUTIONS
        ↓
TECHNOLOGIES USED
        ↓
PROJECT SIMILARITY
        ↓
PROJECT COMPARISON
        ↓
ENGINEERING GAPS / OPPORTUNITIES
        ↓
NEW ENGINEERING IDEA
```

The platform should encourage engineering innovation rather than project copying.

---

# 42. Core Principle for the AI Developer

When implementing this project, prioritize the following:

1. Build the frontend first.
2. Use realistic structured local data.
3. Make search extremely easy.
4. Make filtering intuitive.
5. Make project information easy to understand.
6. Make related-project discovery obvious.
7. Make problem exploration a first-class feature.
8. Make comparison useful.
9. Keep the architecture backend-ready.
10. Avoid unnecessary complexity.
11. Do not introduce AI before the data foundation is reliable.
12. Optimize the prototype for observing real student behavior.
13. Do not make academic originality claims.
14. Do not fabricate historical data.
15. Treat the prototype as a product-validation experiment.

The most important outcome of this phase is not the number of features implemented.

The most important outcome is learning:

> How do engineering students actually search for, evaluate, compare, and develop final-year project ideas?

The answer to that question should guide the production version of the platform.
