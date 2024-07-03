const path = require('node:path');
const test = require('ava');
const later = require('@breejs/later');
const jobBuilder = require('../src/job-builder');

const root = path.join(__dirname, 'jobs');
const jobPathBasic = path.join(root, 'basic.js');

const baseConfig = {
  root,
  timeout: 0,
  interval: 0,
  hasSeconds: false,
  defaultExtension: 'js',
  acceptedExtensions: ['.js', '.mjs']
};

const baseJobConfig = {
  name: 'basic',
  path: jobPathBasic,
  timeout: 0,
  interval: 0
};

function job(t, _job, config, expected) {
  t.deepEqual(
    jobBuilder(_job || 'basic', { ...baseConfig, ...config }),
    expected
  );
}

test(
  'job name as file name without extension',
  job,
  null,
  {},
  {
    name: 'basic',
    path: jobPathBasic,
    timeout: 0,
    interval: 0,
    runAs: 'worker'
  }
);

test(
  'job name as file name with extension',
  job,
  'basic.js',
  {},
  {
    name: 'basic.js',
    path: jobPathBasic,
    timeout: 0,
    interval: 0,
    runAs: 'worker'
  }
);

function basic() {
  setTimeout(() => {
    console.log('hello');
  }, 100);
}

test(
  'job is function',
  job,
  basic,
  {},
  {
    name: 'basic',
    path: `(${basic.toString()})()`,
    worker: { eval: true },
    timeout: 0,
    interval: 0,
    runAs: 'worker'
  }
);

test(
  'job.path is function',
  job,
  { path: basic, worker: { test: 1 } },
  {},
  {
    path: `(${basic.toString()})()`,
    worker: { eval: true, test: 1 },
    timeout: 0,
    runAs: 'worker'
  }
);

test(
  'job.path is blank and name of job is defined without extension',
  job,
  { name: 'basic', path: '' },
  {},
  { name: 'basic', path: jobPathBasic, timeout: 0, runAs: 'worker' }
);

test(
  'job.path is blank and name of job is defined with extension',
  job,
  { name: 'basic.js', path: '' },
  {},
  { name: 'basic.js', path: jobPathBasic, timeout: 0, runAs: 'worker' }
);

test(
  'job.path is path to file',
  job,
  { path: jobPathBasic },
  {},
  { path: jobPathBasic, timeout: 0, runAs: 'worker' }
);

test(
  'job.path is not a file path',
  job,
  { path: '*.js', worker: { test: 1 } },
  {},
  { path: '*.js', timeout: 0, worker: { eval: true, test: 1 }, runAs: 'worker' }
);

test(
  'job.timeout is value',
  job,
  { path: jobPathBasic, timeout: 10 },
  {},
  { path: jobPathBasic, timeout: 10, runAs: 'worker' }
);

test(
  'job.interval is value',
  job,
  { path: jobPathBasic, interval: 10 },
  {},
  { path: jobPathBasic, interval: 10, runAs: 'worker' }
);

test(
  'job.cron is value',
  job,
  { path: jobPathBasic, cron: '* * * * *' },
  {},
  {
    path: jobPathBasic,
    cron: '* * * * *',
    interval: later.parse.cron('* * * * *'),
    runAs: 'worker'
  }
);

test(
  'job.cron is value with hasSeconds config',
  job,
  { path: jobPathBasic, cron: '* * * * *', hasSeconds: false },
  {},
  {
    path: jobPathBasic,
    cron: '* * * * *',
    interval: later.parse.cron('* * * * *'),
    hasSeconds: false,
    runAs: 'worker'
  }
);

test(
  'job.cron is schedule',
  job,
  { path: jobPathBasic, cron: later.parse.cron('* * * * *') },
  {},
  {
    path: jobPathBasic,
    cron: later.parse.cron('* * * * *'),
    interval: later.parse.cron('* * * * *'),
    runAs: 'worker'
  }
);

test(
  'default interval is greater than  0',
  job,
  { name: 'basic', interval: undefined },
  { interval: 10 },
  {
    name: 'basic',
    path: jobPathBasic,
    timeout: 0,
    interval: 10,
    runAs: 'worker'
  }
);

test(
  'job as file inherits timezone from config',
  job,
  'basic',
  { timezone: 'local' },
  {
    timezone: 'local',
    name: 'basic',
    path: jobPathBasic,
    timeout: 0,
    interval: 0,
    runAs: 'worker'
  }
);

test(
  'job as function inherits timezone from config',
  job,
  basic,
  { timezone: 'local' },
  {
    timezone: 'local',
    name: 'basic',
    path: `(${basic.toString()})()`,
    timeout: 0,
    interval: 0,
    runAs: 'worker',
    worker: { eval: true }
  }
);

test(
  'job as object inherits timezone from config',
  job,
  { name: 'basic' },
  { timezone: 'local' },
  {
    timezone: 'local',
    name: 'basic',
    path: jobPathBasic,
    timeout: 0,
    runAs: 'worker'
  }
);

test(
  'job as object retains its own timezone',
  job,
  { name: 'basic', timezone: 'America/New_York' },
  { timezone: 'local' },
  {
    timezone: 'America/New_York',
    name: 'basic',
    path: jobPathBasic,
    timeout: 0,
    runAs: 'worker'
  }
);

test('successfully applies job runAs', (t) => {
  t.plan(3);
  const base_job = jobBuilder({ ...baseJobConfig }, { ...baseConfig });
  const proc_job = jobBuilder(
    { ...baseJobConfig, runAs: 'process' },
    { ...baseConfig }
  );
  const worker_job = jobBuilder(
    { ...baseJobConfig, runAs: 'worker' },
    { ...baseConfig }
  );

  t.true(base_job.runAs === 'worker');
  t.true(proc_job.runAs === 'process');
  t.true(worker_job.runAs === 'worker');
});

test('successfully overwrites job runAs with breeConfig', (t) => {
  t.plan(4);
  const job1 = jobBuilder(
    { ...baseJobConfig, runAs: 'worker' },
    { ...baseConfig, runJobsAs: 'process' }
  ); // inherit process
  const job2 = jobBuilder(
    { ...baseJobConfig, runAs: 'process' },
    { ...baseConfig, runJobsAs: 'worker' }
  ); // inherit worker
  const job3 = jobBuilder(
    { ...baseJobConfig },
    { ...baseConfig, runJobsAs: 'process' }
  ); // inherit process
  const job4 = jobBuilder({ ...baseJobConfig }, { ...baseConfig }); // base config

  t.true(job1.runAs === 'process');
  t.true(job2.runAs === 'worker');
  t.true(job3.runAs === 'process');
  t.true(job4.runAs === 'worker');
});
