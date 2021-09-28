const express = require('express');
const basicAuth = require('express-basic-auth');
const httpProxy = require('http-proxy');

// Note 3a1a is the name of whatever data cube you have
const DATA_CUBE_NAME = 'wikipediae561';

function startProxyApp() {
  // Create a new Express application.
  let proxyApp = express();

  // ----------------------------------------------------------
  // Do the authentication
  // ----------------------------------------------------------

  proxyApp.use(
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
  });

  proxyApp.use((req, res) => {
    proxy.web(req, res, {
      // This assumes that you have Imply 2.5 or higher running with the quickstart config with:
      //
      // userMode: header-user
      // subsetFilterUrl: 'http://localhost:9099'
      target: 'http://localhost:9096',
    });
  });

  // Start the server
  proxyApp.listen(9097);
  console.log('Proxy app listening on 9097');
}

function startSubsetFilterApp() {
  // Create a new Express application.
  let authApp = express();

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

  authApp.post('/', express.json(), (req, res) => {
    const body = req.body;
    console.log('looking up', body);

    res.json({
      filter: userNameToSubsetFilter(body.user.name),
    });
  });

  authApp.listen(9099);
  console.log('Subset filter app listening on 9099');
}

startProxyApp();
startSubsetFilterApp();
