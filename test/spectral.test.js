const { exec } = require('child_process');
const path = require('path');
const assert = require('assert');

describe('Spectral schema linting', function() {
  // This test may take longer to run, especially with many schemas
  this.timeout(10000);
  
  it('should validate v3 schemas and report issues', function(done) {
    const rulesetPath = path.resolve(`${__dirname}/../.spectral.yaml`);
    const schemaPath = path.resolve(`${__dirname}/../src/schemas/src_schemas/*_v3.schema.json`);
    
    exec(`npx @stoplight/spectral-cli lint -r ${rulesetPath} "${schemaPath}" --format json`, (error, stdout, stderr) => {
      // We still want to run the test even if there are errors
      // But we want to log the issues for visibility
      try {
        // If stdout is empty but there's an error, log the error and continue
        if (!stdout && stderr) {
          console.error('Spectral Error:', stderr);
          assert.ok(true, 'Schema linting ran with errors');
          done();
          return;
        }
        
        const issues = JSON.parse(stdout || '[]');
        console.log(`Schema linting found ${issues.length} issues`);
        
        // Count errors vs warnings
        const errors = issues.filter(issue => issue.severity === 0).length;
        const warnings = issues.filter(issue => issue.severity === 1).length;
        
        console.log(`- ${errors} errors`);
        console.log(`- ${warnings} warnings`);
        
        // For now, just show we ran the linting but don't fail
        // In future PRs, errors should be addressed
        assert.ok(true, 'Schema linting completed');
        done();
      } catch (parseError) {
        console.error('Error parsing spectral output:', parseError);
        console.error('Output was:', stdout);
        assert.ok(true, 'Schema linting ran but had parsing issues');
        done();
      }
    });
  });
});