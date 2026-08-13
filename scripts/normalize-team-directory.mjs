import { readFile, writeFile } from "node:fs/promises";

const directoryPath = new URL("../src/data/team-directory.json", import.meta.url);
const groups = JSON.parse(await readFile(directoryPath, "utf8"));

const majorNames = new Map([
  ["Ad/pr major/ shuford minor", "Advertising and Public Relations"],
  ["Applied Sciences-Environmental Engineering Track", "Applied Sciences"],
  ["BSBA / B.S in Advertising & Public Relations", "Business Administration; Advertising and Public Relations"],
  ["Biology Major, Food Studies Minor", "Biology"],
  ["Biology and Chemistry Major", "Biology; Chemistry"],
  ["Biology major", "Biology"],
  ["Biology, B.S. major / Neuroscience & Chemistry minors", "Biology"],
  ["Biomedical Engineering in Lampe Joint Program UNC/NC State", "Biomedical Engineering"],
  ["Business Administration & Management and Society, Econ Minor", "Business Administration; Management and Society"],
  ["Business Administration / Conflict Management", "Business Administration"],
  ["Business and political science double major; Econ minor", "Business Administration; Political Science"],
  ["Business, Economics, History minor", "Business Administration; Economics"],
  ["Computer Science and Neuroscience Double Major", "Computer Science; Neuroscience"],
  ["Computer Science and Psychology/ Business Administration Minor", "Computer Science; Psychology"],
  ["Current Economics Major, Intended Major in Business Administration with Minors in Economics and Data Science", "Economics; Business Administration"],
  ["Currently a double major in Pre-Business and Sports Administration", "Business Administration; Sports Administration"],
  ["Data Science + Political Science", "Data Science; Political Science"],
  ["Data Science; Peace, War, and Defense", "Data Science; Peace, War, and Defense"],
  ["Double Major: Sociology & Political Science", "Sociology; Political Science"],
  ["Economics & Public Policy", "Economics; Public Policy"],
  ["Economics, Education minor, Neuroscience minor", "Economics"],
  ["Environmental Health & Quantitative Energy", "Environmental Health; Quantitative Energy"],
  ["Environmental Studies, Public Policy and GIS minors", "Environmental Studies"],
  ["Environmental studies with a minor in GIS", "Environmental Studies"],
  ["Geology and Business Administration", "Geology; Business Administration"],
  ["Global Studies major, English & Comparative Literature major, Studio Art minor", "Global Studies; English and Comparative Literature"],
  ["Global Studies, Chinese, Public Policy", "Global Studies; Chinese; Public Policy"],
  ["Health Policy and Management and Biology Major", "Health Policy and Management; Biology"],
  ["History and Public Policy majors", "History; Public Policy"],
  ["Human Development and Family Science and Biology Major. Spanish for the Medical Professions Minor", "Human Development and Family Science; Biology"],
  ["Human Development and Family Science and Political Science", "Human Development and Family Science; Political Science"],
  ["Major 1: Mathematics BS, Major 2: Computer Science BS", "Mathematics; Computer Science"],
  ["Major(s): Political Science and Advertising/Public Relations , Minor: African American and Diaspora Studies", "Political Science; Advertising and Public Relations"],
  ["Major-Economics/information systems", "Economics; Information Systems"],
  ["Major: Economics, hoping to minor in: Business and Entrepreneurship", "Economics"],
  ["Major: Neuroscience (Will be applying HPM at Gillings) + Minors: Chem", "Neuroscience"],
  ["Major: Public Policy and Political Science", "Public Policy; Political Science"],
  ["Major:Advertising and Public Relations/Minor: Spanish for the professions", "Advertising and Public Relations"],
  ["Majors in Political Science and Hispanic Studies, Minor in Philosophy", "Political Science; Hispanic Studies"],
  ["Majors: Applied Mathematics & (Pre) Business Administration; Minor: Computer Science", "Applied Mathematics; Business Administration"],
  ["Majors: History and Global Studies. Minor: German", "History; Global Studies"],
  ["Media and Journalism - Advertising and Public Relations (Political Communications Track), Spanish for the Professions (Business Track)", "Media and Journalism"],
  ["Neuroscience & Economics", "Neuroscience; Economics"],
  ["Neuroscience B.S., Psychology B.A., Chemistry Minor", "Neuroscience; Psychology"],
  ["Nutrition: Health and Society, Creative writing minor, chemistry minor", "Nutrition"],
  ["Peace, War, and Defense (Major). Political Science (Major), Geographic Information Sciences (Minor)", "Peace, War, and Defense; Political Science"],
  ["Peace, War, and Defense (PWAD) B.A., Public Policy B.A., Arabic Minor", "Peace, War, and Defense; Public Policy"],
  ["Political Science & Human Organizational Leadership and Development", "Political Science; Human and Organizational Leadership Development"],
  ["Political Science Major - Italian Minor", "Political Science"],
  ["Political Science Major, Minor in MEJO", "Political Science"],
  ["Political Science and Human and Organizational Leadership Development (HOLD); School of Education; Pre-Law Track", "Political Science; Human and Organizational Leadership Development"],
  ["Political Science and Information Science", "Political Science; Information Science"],
  ["Political Science and Interdisciplinary Studies (International Relations of Sustainable Development) Minor in Geology", "Political Science; Interdisciplinary Studies"],
  ["Political Science and Psychology Majors", "Political Science; Psychology"],
  ["Political Science and Public Policy", "Political Science; Public Policy"],
  ["Political Science, Journalism / Public Policy Minor", "Political Science; Journalism"],
  ["Political Science, Media and Journalism, Political Communication Focus Program", "Political Science; Media and Journalism"],
  ["Political Science, Psychology", "Political Science; Psychology"],
  ["Political Science/Economics", "Political Science; Economics"],
  ["Political Science/Human Development and Family Science/ Data Science", "Political Science; Human Development and Family Science; Data Science"],
  ["Psychology & Political Science", "Psychology; Political Science"],
  ["Psychology major pre-dental track with a minor in Spanish for the health professions", "Psychology"],
  ["Public Policy & Social Work", "Public Policy; Social Work"],
  ["Public Policy and Economics", "Public Policy; Economics"],
  ["Public Policy, Pre-Hussman Studies, and Art History", "Public Policy; Art History"],
  ["Public policy & media and journalism PR double major", "Public Policy; Media and Journalism"],
  ["Sports journalism and marketing major, philosophy/economics/political science minor.", "Sports Journalism and Marketing"],
]);

for (const group of groups) {
  for (const member of group.members) {
    if (member.major && majorNames.has(member.major)) {
      member.major = majorNames.get(member.major);
    }
  }
}

const academicAffairs = groups.find((group) => group.slug === "academic-affairs");
const presidentOffice = groups.find((group) => group.slug === "office-of-the-student-body-president");
const bennettIndex = academicAffairs?.members.findIndex((member) => member.email === "bhilberg@unc.edu") ?? -1;

if (academicAffairs && presidentOffice && bennettIndex >= 0) {
  const [bennett] = academicAffairs.members.splice(bennettIndex, 1);
  bennett.title = "Alumni Technical Advisor";
  presidentOffice.members.push(bennett);
}

await writeFile(directoryPath, `${JSON.stringify(groups, null, 2)}\n`);
