const express = require('express');
const basicAuth = require('express-basic-auth');
const httpProxy = require('http-proxy');

// Create a new Express application.
let app = express();

// ----------------------------------------------------------
// Do the authentication
// ----------------------------------------------------------

app.use(
  basicAuth({
    challenge: true,
    users: {
      'mr-admin': 'admin_secret1',
      'mr-user': 'user_secret1',
    },
  }),
);

// ----------------------------------------------------------
// Beyond this point the user is authenticated
// ----------------------------------------------------------

function userNameToObject(userName) {
  // This is a very crude user database.
  switch (userName) {
    case 'mr-admin':
      return {
        name: userName, // The id of the user object, it often make sense for this to be identical to the email
        email: 'htraveler@my-company.com', // (optional) the email which is shown in the user menu
        firstName: 'Happy', // (optional)
        lastName: 'Traveler', // (optional)
        roles: ['super-admin'], // the roleNames associated with this user
        actualRoles: [
          // This user uses the special super-admin role which can do anything.
          // Its permissions do not need to be declared explicitly
          { name: 'super-admin' },
        ],
      };

    case 'mr-user':
      return {
        name: userName,
        email: 'jroger@my-company.com',
        firstName: 'Jolly',
        lastName: 'Roger',
        roles: ['some-user'],
        actualRoles: [
          // This user uses the generic some-user role, in this case the role is
          // defined inline explicitly defining what permissions are accessible to this user.
          {
            name: 'some-user',
            permissions: [{ name: 'AccessVisualization' }, { name: 'ChangeDashboards' }],
          },
        ],
      };

    default:
      throw new Error(`no such user ${userName}`);
  }
}

let proxy = httpProxy.createProxyServer({});

proxy.on('proxyReq', function (proxyReq, req, res, options) {
  // This will get executed on every request
  let implyToken = {
    expiry: Date.now() + 30 * 60 * 1000, // 30 min from now
    appUser: userNameToObject(req.auth.user),
  };

  // The token is encoded as a base64 JSON string
  const encodedImplyToken = new Buffer(JSON.stringify(implyToken), 'utf-8').toString('base64');
  proxyReq.setHeader('x-imply-token', encodedImplyToken);
});

app.use((req, res) => {
  proxy.web(req, res, {
    // This assumes that you have Imply 2.4.2 or higher running with the quickstart config with `userMode: header-user`
    target: 'http://localhost:9095',
  });
});

// Start the server
app.listen(9096);
console.log('Listening on 9096');
