import { GraphQLServer } from "graphql-yoga";
import { Prisma } from "prisma-binding";
import resolvers from "./resolvers";

function paymentBinding() {
  return {
    mutation: {
      async sendPayment({ userId, paymentAmount, paymentMethod }) {
        console.log(userId, paymentAmount, paymentMethod);
        return true;
      }
    }
  };
}

const server = new GraphQLServer({
  typeDefs: "src/schema/service-schema.graphql",
  resolvers,
  context: req => {
    const headers = req && req.request && req.request.headers;
    return {
      isModerator: headers.role === "MODERATOR",
      userId: headers.userid,
      paymentBinding: paymentBinding(),
      dataAccess: new Prisma({
        typeDefs: "src/generated/prisma.graphql",
        endpoint: "https://us1.prisma.sh/abhi-aiyer/credits/dev"
      })
    };
  }
});

server.start(() => console.log("Server is running on localhost:4000"));
