const express = require('express');
const basicAuth = require('express-basic-auth');
const httpProxy = require('http-proxy');

// Note 3a1a is the name of whatever data cube you have
const DATA_CUBE_NAME = 'wikipediae561';

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
      'mr-user2': 'user_secret2',
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
    case 'mr-user2':
      return {
        name: userName,
        email: 'jroger@my-company.com',
        firstName: `Jolly (${userName})`,
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

function userNameToSubsetFilter(userName) {
  // This is a very crude user database.
  switch (userName) {
    case 'mr-admin':
      return 'true';

    case 'mr-user':
      return '$channel == "#en.wikipedia"';

    case 'mr-user2':
      return '$channel == "#fr.wikipedia"';

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
  const encodedImplyToken = Buffer.from(JSON.stringify(implyToken), 'utf-8').toString('base64');
  proxyReq.setHeader('x-imply-token', encodedImplyToken);

  console.log(req.method + ' ' + req.url);
  if (req.method === 'POST') {
    let subsetFilters = {
      [DATA_CUBE_NAME]: userNameToSubsetFilter(req.auth.user),
    };

    const encodedSubsetFilters = Buffer.from(JSON.stringify(subsetFilters), 'utf-8').toString(
      'base64',
    );
    proxyReq.setHeader('x-imply-subset-filters', encodedSubsetFilters);
  }
});

proxy.on('error', () => {
  console.error('Proxy error');
});

app.use((req, res) => {
  proxy.web(req, res, {
    // This assumes that you have Imply 2.5 or higher running with the quickstart config with:
    //
    // userMode: header-user
    // headerSubsetFilters: require
    target: 'http://localhost:9096',
  });
});

// Start the server
app.listen(9097);
console.log('Listening on 9097');
