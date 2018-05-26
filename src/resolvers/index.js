export default {
  Query: {
    getBalance: async (root, params, { dataAccess, userId }) => {
      const account = await dataAccess.query.creditAccount({
        where: {
          userId,
        }
      });

      return account && account.balance;
    }
  }
};
