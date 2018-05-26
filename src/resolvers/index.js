export default {
  Query: {
    getBalance: async (root, params, { dataAccess, userId }) => {
      const account = await dataAccess.query.creditAccount({
        where: {
          userId
        }
      });

      return account && account.balance;
    }
  },
  Mutation: {
    addSku: async (root, { sku }, { dataAccess, isModerator }) => {
      if (!isModerator) {
        throw new Error("User must be a moderator to add skus");
      }

      return await dataAccess.mutation.createSku({ data: sku });
    },
    updateSku: async (root, { skuId, sku }, { dataAccess, isModerator }) => {
      if (!isModerator) {
        throw new Error("User must be a moderator to add skus");
      }

      return await dataAccess.mutation.updateSku({
        data: sku,
        where: { id: skuId }
      });
    },
    createPricingTable: async (
      root,
      { pricingTableId, description, skuIds },
      { dataAccess, isModerator }
    ) => {
      if (!isModerator) {
        throw new Error("User must be a moderator to add skus");
      }

      const input = {
        data: {
          name: pricingTableId,
          description,
          skuIds: {
            set: skuIds
          }
        }
      };

      const fieldInfo = `{
        id
        name
        description
        skuIds
      }
    `;

      return await dataAccess.mutation.createPricingTable(input, fieldInfo);
    }
  }
};
