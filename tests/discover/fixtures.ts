// Fictional fixtures from the Discover prototype (sycamore-volunteer-preview/dist/discover/opportunities.js,
// enriched by taxonomy.js), kept so the ported engine runs against the same data its 22 tests were written for.
// VITA is a real program type; the provider, opening and logistics below are fictional. Never shown in the app.
import type { Opportunity } from '../../src/lib/discover/types.ts';

/** opportunities.js as loaded alone (the original engine tests). */
export const baseOpportunities = (): Opportunity[] => structuredClone(BASE);

/** After taxonomy.js: required/practice skills, format, area, and two more listings. */
export const taxonomyOpportunities = (): Opportunity[] => structuredClone(RICH);

const BASE: Opportunity[] = [
 {
  "id": "tax",
  "title": "Community tax support",
  "role": "Tax preparation training pathway",
  "org": "Neighborhood Tax Access · fictional provider",
  "topic": "accounting",
  "cause": "Financial access",
  "tags": [
   "accounting",
   "tax",
   "excel"
  ],
  "tasks": [
   "Practice preparing sample tax returns in supervised training",
   "Learn intake and document-checking procedures",
   "Assist only in tasks the organizer authorizes after required training"
  ],
  "day": "Saturday",
  "time": "9 AM–12 PM",
  "weeks": 8,
  "travel": {
   "transit": 35,
   "car": 18,
   "bike": null
  },
  "cost": 6,
  "support": 5,
  "supportNote": "Structured training, practice exercises, and a designated supervisor.",
  "training": "Organizer-approved training and applicable certification are required before tax-preparation duties.",
  "status": "open",
  "kind": "VITA-style pathway",
  "outcome": "Practice applying accounting concepts in a community tax-support setting."
 },
 {
  "id": "budget",
  "title": "A fundraiser with a purpose",
  "role": "Event budget assistant",
  "org": "Community Roots Collective · fictional",
  "topic": "accounting",
  "cause": "Community care",
  "tags": [
   "budgeting",
   "excel",
   "events"
  ],
  "tasks": [
   "Compare sample supply quotes against a fixed event budget",
   "Maintain an expense tracker with coordinator review",
   "Prepare a short spending summary"
  ],
  "day": "Sunday",
  "time": "10 AM–1 PM",
  "weeks": 1,
  "travel": {
   "transit": 25,
   "car": 12,
   "bike": 22
  },
  "cost": 4,
  "support": 4,
  "supportNote": "Budget template, orientation, and coordinator review.",
  "training": null,
  "status": "open",
  "kind": "Finance & planning",
  "outcome": "Practice budgeting and reporting on a small event."
 },
 {
  "id": "forest",
  "title": "Put down new roots",
  "role": "Neighborhood planting volunteer",
  "org": "Green Neighborhood Crew · fictional",
  "topic": "outdoors",
  "cause": "Environment",
  "tags": [
   "planting",
   "conservation",
   "fieldwork"
  ],
  "tasks": [
   "Practice planting and mulching with a crew leader",
   "Learn basic tree-care procedures",
   "Help organize the site cleanup"
  ],
  "day": "Saturday",
  "time": "9 AM–12 PM",
  "weeks": 1,
  "travel": {
   "transit": 20,
   "car": 10,
   "bike": 15
  },
  "cost": 3,
  "support": 5,
  "supportNote": "Beginner briefing, tools provided, and a supervised crew.",
  "training": null,
  "status": "open",
  "kind": "Nature & outdoors",
  "outcome": "Learn introductory planting and tree-care techniques."
 },
 {
  "id": "pantry",
  "title": "Make the next meal possible",
  "role": "Food pantry logistics helper",
  "org": "Open Table Neighbors · fictional",
  "topic": "community",
  "cause": "Food access",
  "tags": [
   "logistics",
   "distribution",
   "community"
  ],
  "tasks": [
   "Organize incoming food by the organizer’s sorting rules",
   "Support packing and distribution alongside the team",
   "Practice inventory checks using a simple tracker"
  ],
  "day": "Saturday",
  "time": "1–4 PM",
  "weeks": 2,
  "travel": {
   "transit": 30,
   "car": 14,
   "bike": 25
  },
  "cost": 4,
  "support": 4,
  "supportNote": "On-site orientation and a shift lead available for questions.",
  "training": null,
  "status": "open",
  "kind": "Community & food access",
  "outcome": "Practice logistics and collaborative service delivery."
 },
 {
  "id": "mentor",
  "title": "Help someone find their footing",
  "role": "Homework club learning buddy",
  "org": "Learning Together Circle · fictional",
  "topic": "teaching",
  "cause": "Education",
  "tags": [
   "tutoring",
   "teaching",
   "mentoring"
  ],
  "tasks": [
   "Support a supervised homework activity",
   "Explain a topic using the program’s lesson materials",
   "Reflect with the supervising educator after the session"
  ],
  "day": "Wednesday",
  "time": "4–6 PM",
  "weeks": 6,
  "travel": {
   "transit": 40,
   "car": 20,
   "bike": 35
  },
  "cost": 5,
  "support": 5,
  "supportNote": "Lesson materials, educator supervision, and feedback after sessions.",
  "training": "Organizer screening and safeguarding orientation must be completed.",
  "status": "open",
  "kind": "Teaching & mentoring",
  "outcome": "Practice explaining ideas with structured educator feedback."
 },
 {
  "id": "design",
  "title": "Tell a story that brings people in",
  "role": "Community outreach design helper",
  "org": "Neighborhood Arts Desk · fictional",
  "topic": "creative",
  "cause": "Arts & culture",
  "tags": [
   "design",
   "outreach",
   "writing"
  ],
  "tasks": [
   "Design a sample event flyer from an organizer brief",
   "Draft a short outreach message",
   "Revise the work with feedback from the outreach lead"
  ],
  "day": "Sunday",
  "time": "11 AM–2 PM",
  "weeks": 1,
  "travel": {
   "transit": 15,
   "car": 8,
   "bike": 12
  },
  "cost": 2,
  "support": 4,
  "supportNote": "Creative brief, sample assets, and feedback from an outreach lead.",
  "training": null,
  "status": "open",
  "kind": "Creative & outreach",
  "outcome": "Practice creating communication materials for a community event."
 },
 {
  "id": "creek",
  "title": "A fresh start for the creek",
  "role": "Creek restoration crew helper",
  "org": "Watershed Friends · fictional",
  "topic": "outdoors",
  "cause": "Environment",
  "tags": [
   "conservation",
   "fieldwork",
   "logistics"
  ],
  "tasks": [
   "Help remove litter in a designated supervised area",
   "Sort and return tools with the team",
   "Learn the organizer’s restoration procedures"
  ],
  "day": "Sunday",
  "time": "8–11 AM",
  "weeks": 1,
  "travel": {
   "transit": null,
   "car": 32,
   "bike": 65
  },
  "cost": null,
  "support": 4,
  "supportNote": "Safety briefing and supervised work zones.",
  "training": null,
  "status": "open",
  "kind": "Nature & outdoors",
  "outcome": "Practice conservation tasks and equipment coordination."
 }
];

const RICH: Opportunity[] = [
 {
  "id": "tax",
  "title": "Community tax support",
  "role": "Tax preparation training pathway",
  "org": "Neighborhood Tax Access · fictional provider",
  "topic": "accounting",
  "cause": "Financial Access",
  "tags": [
   "accounting",
   "tax",
   "excel"
  ],
  "tasks": [
   "Practice preparing sample tax returns in supervised training",
   "Learn intake and document-checking procedures",
   "Assist only in tasks the organizer authorizes after required training"
  ],
  "day": "Saturday",
  "time": "9 AM–12 PM",
  "weeks": 8,
  "travel": {
   "transit": 35,
   "car": 18,
   "bike": null
  },
  "cost": 6,
  "support": 5,
  "supportNote": "Structured training, practice exercises, and a designated supervisor.",
  "training": "Organizer-approved training and applicable certification are required before tax-preparation duties.",
  "status": "open",
  "kind": "VITA-style pathway",
  "outcome": "Practice applying accounting concepts in a community tax-support setting.",
  "area": "finance",
  "format": "inperson",
  "level": "Training required",
  "required": [
   "excel"
  ],
  "practice": [
   "accounting",
   "tax",
   "communication"
  ],
  "deliverable": "Supervised practice exercises and organizer-authorized support tasks.",
  "beginner": true,
  "sourceUrl": null,
  "checkedAt": null
 },
 {
  "id": "budget",
  "title": "A fundraiser with a purpose",
  "role": "Event budget assistant",
  "org": "Community Roots Collective · fictional",
  "topic": "accounting",
  "cause": "Community Development",
  "tags": [
   "budgeting",
   "excel",
   "events"
  ],
  "tasks": [
   "Compare sample supply quotes against a fixed event budget",
   "Maintain an expense tracker with coordinator review",
   "Prepare a short spending summary"
  ],
  "day": "Sunday",
  "time": "10 AM–1 PM",
  "weeks": 1,
  "travel": {
   "transit": 25,
   "car": 12,
   "bike": 22
  },
  "cost": 4,
  "support": 4,
  "supportNote": "Budget template, orientation, and coordinator review.",
  "training": null,
  "status": "open",
  "kind": "Finance & planning",
  "outcome": "Practice budgeting and reporting on a small event.",
  "area": "finance",
  "format": "hybrid",
  "level": "Supervised contributor",
  "required": [
   "excel"
  ],
  "practice": [
   "budgeting",
   "cost analysis",
   "excel"
  ],
  "deliverable": "A quote comparison and an expense-tracking sheet.",
  "beginner": true,
  "sourceUrl": null,
  "checkedAt": null
 },
 {
  "id": "forest",
  "title": "Put down new roots",
  "role": "Neighborhood planting volunteer",
  "org": "Green Neighborhood Crew · fictional",
  "topic": "outdoors",
  "cause": "Environment & Conservation",
  "tags": [
   "planting",
   "conservation",
   "fieldwork"
  ],
  "tasks": [
   "Practice planting and mulching with a crew leader",
   "Learn basic tree-care procedures",
   "Help organize the site cleanup"
  ],
  "day": "Saturday",
  "time": "9 AM–12 PM",
  "weeks": 1,
  "travel": {
   "transit": 20,
   "car": 10,
   "bike": 15
  },
  "cost": 3,
  "support": 5,
  "supportNote": "Beginner briefing, tools provided, and a supervised crew.",
  "training": null,
  "status": "open",
  "kind": "Nature & outdoors",
  "outcome": "Learn introductory planting and tree-care techniques.",
  "area": "environment",
  "format": "inperson",
  "level": "Beginner welcome",
  "required": [],
  "practice": [
   "planting",
   "conservation",
   "fieldwork"
  ],
  "deliverable": "Complete assigned planting and cleanup tasks with a crew.",
  "beginner": true,
  "sourceUrl": null,
  "checkedAt": null
 },
 {
  "id": "pantry",
  "title": "Make the next meal possible",
  "role": "Food pantry logistics helper",
  "org": "Open Table Neighbors · fictional",
  "topic": "community",
  "cause": "Food Access & Nutrition",
  "tags": [
   "logistics",
   "distribution",
   "community"
  ],
  "tasks": [
   "Organize incoming food by the organizer’s sorting rules",
   "Support packing and distribution alongside the team",
   "Practice inventory checks using a simple tracker"
  ],
  "day": "Saturday",
  "time": "1–4 PM",
  "weeks": 2,
  "travel": {
   "transit": 30,
   "car": 14,
   "bike": 25
  },
  "cost": 4,
  "support": 4,
  "supportNote": "On-site orientation and a shift lead available for questions.",
  "training": null,
  "status": "open",
  "kind": "Community & food access",
  "outcome": "Practice logistics and collaborative service delivery.",
  "area": "operations",
  "format": "inperson",
  "level": "Beginner welcome",
  "required": [],
  "practice": [
   "inventory",
   "logistics",
   "distribution"
  ],
  "deliverable": "Sorted supplies and a supervisor-reviewed inventory count.",
  "beginner": true,
  "sourceUrl": null,
  "checkedAt": null
 },
 {
  "id": "mentor",
  "title": "Help someone find their footing",
  "role": "Homework club learning buddy",
  "org": "Learning Together Circle · fictional",
  "topic": "teaching",
  "cause": "Education & Youth",
  "tags": [
   "tutoring",
   "teaching",
   "mentoring"
  ],
  "tasks": [
   "Support a supervised homework activity",
   "Explain a topic using the program’s lesson materials",
   "Reflect with the supervising educator after the session"
  ],
  "day": "Wednesday",
  "time": "4–6 PM",
  "weeks": 6,
  "travel": {
   "transit": 40,
   "car": 20,
   "bike": 35
  },
  "cost": 5,
  "support": 5,
  "supportNote": "Lesson materials, educator supervision, and feedback after sessions.",
  "training": "Organizer screening and safeguarding orientation must be completed.",
  "status": "open",
  "kind": "Teaching & mentoring",
  "outcome": "Practice explaining ideas with structured educator feedback.",
  "area": "teaching",
  "format": "inperson",
  "level": "Training required",
  "required": [
   "communication"
  ],
  "practice": [
   "teaching",
   "mentoring",
   "tutoring"
  ],
  "deliverable": "A supervised homework activity and reflection.",
  "beginner": true,
  "sourceUrl": null,
  "checkedAt": null
 },
 {
  "id": "design",
  "title": "Tell a story that brings people in",
  "role": "Community outreach design helper",
  "org": "Neighborhood Arts Desk · fictional",
  "topic": "creative",
  "cause": "Arts & Culture",
  "tags": [
   "design",
   "outreach",
   "writing"
  ],
  "tasks": [
   "Design a sample event flyer from an organizer brief",
   "Draft a short outreach message",
   "Revise the work with feedback from the outreach lead"
  ],
  "day": "Sunday",
  "time": "11 AM–2 PM",
  "weeks": 1,
  "travel": {
   "transit": 15,
   "car": 8,
   "bike": 12
  },
  "cost": 2,
  "support": 4,
  "supportNote": "Creative brief, sample assets, and feedback from an outreach lead.",
  "training": null,
  "status": "open",
  "kind": "Creative & outreach",
  "outcome": "Practice creating communication materials for a community event.",
  "area": "creative",
  "format": "remote",
  "level": "Supervised contributor",
  "required": [
   "design"
  ],
  "practice": [
   "design",
   "writing",
   "outreach"
  ],
  "deliverable": "A reviewed flyer and outreach message.",
  "beginner": true,
  "sourceUrl": null,
  "checkedAt": null
 },
 {
  "id": "creek",
  "title": "A fresh start for the creek",
  "role": "Creek restoration crew helper",
  "org": "Watershed Friends · fictional",
  "topic": "outdoors",
  "cause": "Environment & Conservation",
  "tags": [
   "conservation",
   "fieldwork",
   "logistics"
  ],
  "tasks": [
   "Help remove litter in a designated supervised area",
   "Sort and return tools with the team",
   "Learn the organizer’s restoration procedures"
  ],
  "day": "Sunday",
  "time": "8–11 AM",
  "weeks": 1,
  "travel": {
   "transit": null,
   "car": 32,
   "bike": 65
  },
  "cost": null,
  "support": 4,
  "supportNote": "Safety briefing and supervised work zones.",
  "training": null,
  "status": "open",
  "kind": "Nature & outdoors",
  "outcome": "Practice conservation tasks and equipment coordination.",
  "area": "environment",
  "format": "inperson",
  "level": "Beginner welcome",
  "required": [],
  "practice": [
   "conservation",
   "fieldwork",
   "logistics"
  ],
  "deliverable": "Assigned cleanup tasks and returned equipment.",
  "beginner": true,
  "sourceUrl": null,
  "checkedAt": null
 },
 {
  "id": "pantry-budget",
  "title": "Plan the next pantry day",
  "role": "Food pantry budget helper",
  "org": "Open Table Neighbors · fictional",
  "topic": "accounting",
  "cause": "Food Access & Nutrition",
  "tags": [
   "budgeting",
   "excel",
   "cost analysis"
  ],
  "tasks": [
   "Compare sample supplier quotes for a pantry distribution",
   "Build a simple per-event food and supply budget",
   "Review the draft expense tracker with the coordinator"
  ],
  "day": "Saturday",
  "time": "Flexible, with a 10 AM check-in",
  "weeks": 2,
  "travel": {
   "transit": 0,
   "car": 0,
   "bike": 0
  },
  "cost": 0,
  "support": 5,
  "supportNote": "Budget template, example data, weekly check-in, and coordinator feedback.",
  "training": null,
  "status": "open",
  "kind": "Finance & planning",
  "outcome": "Practice budgeting while supporting food access.",
  "area": "finance",
  "format": "remote",
  "level": "Supervised contributor",
  "required": [
   "excel"
  ],
  "practice": [
   "budgeting",
   "cost analysis",
   "excel"
  ],
  "deliverable": "A reviewed pantry-day budget and supplier comparison.",
  "beginner": true,
  "sourceUrl": null,
  "checkedAt": null
 },
 {
  "id": "animal-outreach",
  "title": "Help a shelter tell its story",
  "role": "Animal shelter outreach assistant",
  "org": "Kind Paws Circle · fictional",
  "topic": "creative",
  "cause": "Animal Welfare",
  "tags": [
   "outreach",
   "writing",
   "design"
  ],
  "tasks": [
   "Draft two adoption-awareness posts using the organizer’s brief",
   "Prepare a simple Canva visual from provided assets",
   "Revise drafts with the outreach lead"
  ],
  "day": "Sunday",
  "time": "Flexible, with a 1 PM check-in",
  "weeks": 1,
  "travel": {
   "transit": 0,
   "car": 0,
   "bike": 0
  },
  "cost": 0,
  "support": 5,
  "supportNote": "Templates, approved facts, and an outreach lead to review drafts.",
  "training": null,
  "status": "open",
  "kind": "Finance & planning",
  "outcome": "Practice outreach and design while supporting animal welfare.",
  "area": "marketing",
  "format": "remote",
  "level": "Beginner welcome",
  "required": [],
  "practice": [
   "social media",
   "writing",
   "design"
  ],
  "deliverable": "Two approved post drafts and a supporting visual.",
  "beginner": true,
  "sourceUrl": null,
  "checkedAt": null
 }
];
