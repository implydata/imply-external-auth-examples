# Imply External Authentication Examples

This repository is here to collect some examples of how to setup Imply UI to run as part of some other authentication system.

The basic idea is to run the Imply app in a mode (`userMode: header-user`) that will take user authentication information from a header (`x-imply-token`) and to have a reverse proxy that handles all the authentication and authorization work and which acts as a gatekeeper to the Imply app.


## Prerequisites

You will need:

- Imply 2.4.2 or greater - can be downloaded from https://imply.io/get-started
- Node 6.2 or greater


## Setup

1. Start Imply. The quickest way to get Imply up and running is to follow the [quickstart](https://docs.imply.io/on-premise/quickstart). The examples assume that Imply UI is running on `localhost:9095`.
2. Set the correct userMode in the config by editing config file (conf-quickstart/pivot/config.yaml) and adding `userMode: header-user` and restart the Imply UI server.
3. Install dependencies by running `npm install` in this repo.


## HTTP BasicAuth example

Run `node basic-proxy.js` and open http://localhost:9096 in your browser. There are two users defined in the mock external authentication system: `mr-admin` (password: `admin_secret1`) and `mr-user` (password: `user_secret1`). Only once the user is authenticated with the basic-proxy app will the user have access to the Imply app (via the http-proxy reverse proxy module).

Note that the two users feed different permissions to the Imply app allowing the available functionality to be adjusted as needed.
