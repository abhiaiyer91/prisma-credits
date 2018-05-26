export default {
  Query: {
    getBalance: async (root, params, { dataAccess, userId }) => {
      const accountArray = await dataAccess.query.creditAccounts({
        where: {
          userId,
        }
      });

      const account = accountArray && accountArray[0];

      return account && account.balance;
    }
  }
};
