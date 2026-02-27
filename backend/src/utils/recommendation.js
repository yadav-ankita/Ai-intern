const levelToNumber = (level) => {
  const normalized = (level || "").toLowerCase().trim();
  if (normalized.includes("beginner")) return 1;
  if (normalized.includes("intermediate")) return 2;
  if (normalized.includes("advanced")) return 3;
  return 1;
};

const parseAmount = (value) => {
  const num = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(num) ? num : 0;
};

const buildRecommendationProfile = (input = {}) => ({
  skills: String(input.skills || "")
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean),
  preferredDomain: String(input.preferredDomain || "").toLowerCase().trim(),
  preferredLocation: String(input.preferredLocation || "").toLowerCase().trim(),
  durationMonthsRaw: String(input.durationMonths || ""),
  expectedStipendRaw: String(input.expectedStipend || ""),
  studentExperience: String(input.experienceLevel || "").toLowerCase().trim(),
});

const scoreInternships = (internships, profile) => {
  const {
    skills: studentSkills,
    preferredDomain,
    preferredLocation,
    durationMonthsRaw,
    expectedStipendRaw,
    studentExperience,
  } = profile;

  return internships
    .map((internship) => {
      const internshipSkills = String(internship.skills || "")
        .toLowerCase()
        .split(/[\s,]+/)
        .filter(Boolean);
      const totalSkills = internshipSkills.length || 1;
      let matchedSkills = 0;

      studentSkills.forEach((skill) => {
        if (internshipSkills.some((s) => s.includes(skill) || skill.includes(s))) {
          matchedSkills++;
        }
      });
      const uniqueMatches = Math.min(matchedSkills, totalSkills);
      const skillsScore = (uniqueMatches / totalSkills) * 40;

      const internshipDomainBlob = `${internship.domain || ""} ${internship.title || ""} ${internship.skills || ""}`
        .toLowerCase()
        .trim();
      const domainScore =
        preferredDomain && internshipDomainBlob.includes(preferredDomain) ? 20 : 0;

      const internshipLocation = String(internship.location || "").toLowerCase().trim();
      const locationScore =
        preferredLocation &&
        (internshipLocation.includes(preferredLocation) ||
          preferredLocation.includes(internshipLocation) ||
          internshipLocation.includes("remote"))
          ? 10
          : 0;

      const preferredDuration = parseAmount(durationMonthsRaw);
      const internshipDuration = parseAmount(internship.duration_months);
      let durationScore = 0;
      if (preferredDuration > 0 && internshipDuration > 0) {
        if (internshipDuration >= preferredDuration) {
          durationScore = 10;
        } else {
          durationScore = (internshipDuration / preferredDuration) * 10;
        }
      }

      const expectedStipend = parseAmount(expectedStipendRaw);
      const internshipStipend = parseAmount(internship.stipend);
      let stipendScore = 0;
      if (expectedStipend > 0 && internshipStipend > 0) {
        stipendScore =
          internshipStipend >= expectedStipend
            ? 10
            : (internshipStipend / expectedStipend) * 10;
      }

      const internshipLevel = levelToNumber(internship.experience_level || "beginner");
      const studentLevel = levelToNumber(studentExperience || "beginner");
      const levelDiff = Math.abs(internshipLevel - studentLevel);
      const experienceScore = levelDiff === 0 ? 10 : levelDiff === 1 ? 5 : 0;

      const percent = Math.round(
        skillsScore + domainScore + experienceScore + locationScore + durationScore + stipendScore
      );

      return {
        ...internship,
        match_percent: Math.max(0, Math.min(100, percent)),
      };
    })
    .sort((a, b) => b.match_percent - a.match_percent);
};

module.exports = { buildRecommendationProfile, scoreInternships };
