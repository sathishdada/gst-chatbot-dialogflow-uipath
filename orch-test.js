var util = require('util');
var Orchestrator = require('uipath-orchestrator');

var orchestrator = new Orchestrator({
     tenancyName: 'sathishsundaramoorthy1',           // The Orchestrator Tenancy
     usernameOrEmailAddress: 'ssathishsundaram@gmail.com',// The Orchestrator login
     password: 'Password@1',               // The Orchestrator password
     hostname: 'platform-community.azurewebsites.net', // The instance hostname
     isSecure: true,                // optional (defaults to true)
     port: 443, // optional (defaults to 80 or 443 based on isSecure)
     invalidCertificate: false, // optional (defaults to false)
     connectionPool: 5 // options, 0=unlimited (defaults to 1)
});
var apiPath = '/odata/Users';
var apiQuery = {};
orchestrator.get(apiPath, apiQuery, function (err, data) {
    if (err) {
        console.error('Error: ' + err);
    }
    console.log('Data: ' + util.inspect(data));
});