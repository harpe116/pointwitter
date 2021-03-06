require('dotenv').config();
const { ApolloServer, AuthenticationError } = require('apollo-server-micro');
const micro = require('micro');
const { send } = require('micro');
const cors = require('micro-cors')();
const {
  router, get, post, options,
} = require('microrouter');
const { PubSub } = require('apollo-server');

const { prisma } = require('../generated/prisma-client');
const { typeDefs } = require('./schema');

const { resolvers } = require('./resolvers');
const { getUserID } = require('./utils');

const pubsub = new PubSub();

const server = new ApolloServer({
  introspection: true,
  playground: true,
  typeDefs,
  resolvers,
  // Add Prisma to the context as we'll be using that all over
  // Also add pubsub as we need an instance of that in a few places
  context: request => ({
    ...request,
    pubsub,
    prisma,
  }),
  subscriptions: {
    /* We have two tasks when the connection is established
    0. Figure out if the person trying to connect is authorized to do so
    1. Pull out the people they follow so we can pass that to the subscription function */
    onConnect: async (connectionParams) => {
      if (connectionParams.Authorization) {
        const userID = await getUserID({
          prisma,
          connectionParams,
        });
        const following = await prisma.user({ id: userID }).following();
        return {
          userID,
          following,
        };
      }

      throw new AuthenticationError('No token provided for user');
    },
  },
});

const graphqlOptions = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Origin, Authorization',
  );
  send(res, 200);
};

const graphqlPath = '/';
const graphqlHandler = cors(server.createHandler({ path: graphqlPath }));
const routes = router(
  post(graphqlPath, graphqlHandler),
  get(graphqlPath, graphqlHandler),
  options(graphqlPath, cors(graphqlOptions)),
);

const microServer = micro(routes);
microServer.listen();

module.exports = routes;
