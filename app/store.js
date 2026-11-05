'use strict';
// In-memory demo data. Every record is fictional.
const students = {
  S1001: { id: 'S1001', name: 'Ada Okafor',   pin: '4417', advisor: 'Dr. Reyes' },
  S1002: { id: 'S1002', name: 'Ben Castillo', pin: '9032', advisor: 'Dr. Reyes' },
  S1003: { id: 'S1003', name: 'Chloe Nguyen', pin: '2258', advisor: 'Dr. Patel' }
};

const ledgers = {
  S1001: { balance: 1250.0, holds: [],                    aid: 'Federal Pell' },
  S1002: { balance: 4310.5, holds: ['Bursar hold'],       aid: 'None' },
  S1003: { balance: 0.0,    holds: [],                    aid: 'Merit scholarship' }
};

const sessions = {}; // token -> { studentId }

module.exports = { students, ledgers, sessions };
