import semver from 'semver';

export default {
   patchId: 'demo@v1',
   shouldRun: (currentVersion: string) => semver.lte(currentVersion, '0.0.1'),
   alwaysRun: false,
   async run() {
      console.log('Migrate db');
      console.log('Db migrated!');
   }
}

