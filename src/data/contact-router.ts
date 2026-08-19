export interface ContactDestination {
  id: string;
  office: string;
  person: string;
  title: string;
  email: string;
  summary: string;
}

export interface ContactTopic {
  id: string;
  label: string;
  detail: string;
  destination: string;
}

export interface ContactIntent {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  topics: ContactTopic[];
}

export const contactDestinations: ContactDestination[] = [
  { id: "secretary", office: "Office of the Student Body Secretary", person: "Student Body Secretary", title: "Administration-wide triage", email: "usgsec@unc.edu", summary: "The Office of the Student Body Secretary can route a question that crosses teams or does not have an obvious home." },
  { id: "president", office: "Office of the Student Body President", person: "Devin Duncan", title: "Student Body President", email: "duncanda@unc.edu", summary: "For administration-wide leadership, university partnerships, invitations, and executive priorities." },
  { id: "treasurer", office: "Office of the Treasurer", person: "Hadi Rahim", title: "Treasurer", email: "harahim@unc.edu", summary: "For student government funding, financial stewardship, and budget questions." },
  { id: "cabinet", office: "Office of the Chief of the Cabinet", person: "Finlay Cullen", title: "Chief of Cabinet (Interim)", email: "fwcullen@unc.edu", summary: "For partnerships involving multiple cabinet departments or administration-wide implementation." },
  { id: "communications", office: "Office of Communications", person: "Hailey Shapiro", title: "Director of Communications", email: "hmshap@unc.edu", summary: "For press requests, interviews, public information, social media, and communications partnerships." },
  { id: "academic", office: "Academic Affairs", person: "Matthew Howard", title: "Director", email: "mghoward@unc.edu", summary: "For advising, academic support, mentoring, teaching, learning, and student academic policy." },
  { id: "basic-needs", office: "Basic Needs", person: "Chloe Johnson", title: "Director", email: "chlojo@ad.unc.edu", summary: "For food, housing, transportation, and financial-stability resources." },
  { id: "civic", office: "Civic Engagement and Outreach", person: "Shakila Cantebury", title: "Director", email: "scant@unc.edu", summary: "For service, civic participation, student organization outreach, and community partnerships." },
  { id: "dei", office: "Diversity, Equity, and Inclusion", person: "Cameron Lee", title: "Director", email: "campslee@unc.edu", summary: "For belonging, identity, equitable access, and inclusive participation across campus." },
  { id: "environment", office: "Environmental Affairs", person: "Ellie Prosser", title: "Director", email: "eprosser@unc.edu", summary: "For sustainability, waste reduction, food recovery, and environmental stewardship." },
  { id: "external", office: "State and External Affairs", person: "Sophia Fontecchio", title: "Director", email: "sophfont@unc.edu", summary: "For public officials, government relations, public policy, and external public-service partners." },
  { id: "wellness", office: "Student Safety and Wellness", person: "Lauryn Sidni Cooper", title: "Director", email: "lsc@unc.edu", summary: "For mental and physical health resources, prevention, preparedness, and campus safety advocacy." },
];

export const contactIntents: ContactIntent[] = [
  {
    id: "student-issue",
    label: "I need help with a student issue",
    shortLabel: "Student support",
    description: "Find the team closest to an academic, wellbeing, basic-needs, or belonging concern.",
    topics: [
      { id: "academics", label: "Academics, advising, or instruction", detail: "Courses, advising, mentoring, academic support, or academic policy", destination: "academic" },
      { id: "needs", label: "Food, housing, transportation, or finances", detail: "Everyday resources that affect a student's ability to thrive", destination: "basic-needs" },
      { id: "health", label: "Safety, mental health, or physical wellbeing", detail: "Wellness resources, prevention, preparedness, or campus safety", destination: "wellness" },
      { id: "belonging", label: "Belonging, identity, or equitable access", detail: "Inclusion, participation, accessibility, or campus climate", destination: "dei" },
      { id: "other-issue", label: "Something else", detail: "Let the Secretary's office identify the right next step", destination: "secretary" },
    ],
  },
  {
    id: "idea",
    label: "I have an idea or policy proposal",
    shortLabel: "Ideas and policy",
    description: "Match a proposal with the office already working in that area.",
    topics: [
      { id: "idea-academic", label: "Academic experience", detail: "Advising, instruction, learning, or academic innovation", destination: "academic" },
      { id: "idea-environment", label: "Sustainability", detail: "Waste, food recovery, climate, or environmental stewardship", destination: "environment" },
      { id: "idea-community", label: "Service or community engagement", detail: "Civic participation, service, or town-university partnership", destination: "civic" },
      { id: "idea-policy", label: "Government or public policy", detail: "Local, state, or external policy and public officials", destination: "external" },
      { id: "idea-wide", label: "Administration-wide proposal", detail: "An idea spanning several departments or executive priorities", destination: "cabinet" },
    ],
  },
  {
    id: "organization",
    label: "I represent a student organization",
    shortLabel: "Student organizations",
    description: "Reach the office best suited for funding, partnership, outreach, or promotion.",
    topics: [
      { id: "org-funding", label: "Funding or budget question", detail: "Student government finances, funding, or stewardship", destination: "treasurer" },
      { id: "org-partner", label: "Partnership or outreach", detail: "A collaborative program, service project, or community connection", destination: "civic" },
      { id: "org-promotion", label: "Promotion or communications", detail: "Publicity, social media, messaging, or an information campaign", destination: "communications" },
      { id: "org-multi", label: "Work with several departments", detail: "A project that needs cabinet-wide coordination", destination: "cabinet" },
    ],
  },
  {
    id: "invitation",
    label: "I want to invite or partner with the administration",
    shortLabel: "Invitations and partnerships",
    description: "Send an invitation or collaboration request to the right level of the administration.",
    topics: [
      { id: "invite-president", label: "Invite the Student Body President", detail: "Speaking, attendance, university partnerships, or executive leadership", destination: "president" },
      { id: "invite-department", label: "Partner with a department", detail: "A program or initiative involving cabinet expertise", destination: "cabinet" },
      { id: "invite-media", label: "Communications or media appearance", detail: "Campaigns, interviews, messaging, or public-facing collaboration", destination: "communications" },
      { id: "invite-unsure", label: "Not sure who should participate", detail: "Let the Secretary's office route the invitation", destination: "secretary" },
    ],
  },
  {
    id: "media",
    label: "I’m from the press or requesting information",
    shortLabel: "Press and information",
    description: "Direct interview, public-information, and communications requests efficiently.",
    topics: [
      { id: "media-interview", label: "Interview or comment request", detail: "A response, interview, statement, or media appearance", destination: "communications" },
      { id: "media-records", label: "Records or public information", detail: "Official information, records, or administration documentation", destination: "secretary" },
      { id: "media-social", label: "Website or social media question", detail: "Digital content, social accounts, or communications channels", destination: "communications" },
    ],
  },
  {
    id: "unsure",
    label: "I’m not sure where to start",
    shortLabel: "Not sure",
    description: "We’ll make sure your message reaches the right team.",
    topics: [
      { id: "unsure-route", label: "Route my question", detail: "Start with the Office of the Student Body Secretary", destination: "secretary" },
    ],
  },
];
