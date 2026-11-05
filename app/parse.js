'use strict';
// Parses the JSON body of a course-registration request.
// Expected shape: { "course": "CPS5981", "credits": 3 }
function parseRegistration(raw) {
  const body = JSON.parse(raw);
  return {
    course: body.course.toUpperCase(),
    credits: Number(body.credits)
  };
}

module.exports = { parseRegistration };
