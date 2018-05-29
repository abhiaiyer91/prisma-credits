function totalPrice(skus) {
  return (
    skus &&
    skus.reduce((memo, currentVal) => {
      const count =
        (currentVal && currentVal.price && currentVal.price.count) || 0;
      memo += count;
      return memo;
    }, 0)
  );
}

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

      return await dataAccess.mutation.createSku(
        { data: sku },
        `{
            id
            name
            description
            price {
              count
              unit
            }
        }`
      );
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
    },
    purchase: async (
      root,
      { skuIds, description, paymentMethod },
      { dataAccess, userId, paymentBinding }
    ) => {
      if (!userId) {
        throw new Error("Must be logged in to purchase");
      }
      // 1. check to see if the skus exist

      const skus = await dataAccess.query.skus(
        {
          where: {
            name_in: skuIds
          }
        },
        `{
          id
          name
          description
          price {
            count
            unit
          }
      }`
      );

      if (skus.length !== skuIds.length) {
        throw new Error(
          "There was an error processing some of your items, item may not exist"
        );
      }
      // 2. check to see if we have a cardId or a token
      const cardId = paymentMethod && paymentMethod.cardId;
      const token = paymentMethod && paymentMethod.token;
      let paymentMethodToUse;
      // if we have a cardId use it, if we have token use it
      if (!!cardId) {
        paymentMethodToUse = cardId;
      } else {
        paymentMethodToUse = token;
      }

      if (!paymentMethodToUse) {
        throw new Error("No valid payment method supplied to purchase");
      }
      // 3. Calculate the total price of what we are buying
      const total = totalPrice(skus);
      // 4. Process the payment with the payment service
      const successfulPayment = await paymentBinding.mutation.sendPayment({
        userId,
        paymentAmount: total,
        paymentMethod: paymentMethodToUse
      });

      if (!successfulPayment) {
        throw new Error(
          "Unable to process your payment, your payment credentials may have expired"
        );
      }
      // 5. Create a finalized transaction

      const transaction = {
        description,
        total: {
          create: {
            count: total,
            unit: "US_CENTS"
          }
        },
        initiatedBy: {
          create: { userId }
        },
        statusMessage: "Credit Purchase Succeeded",
        status: "SUCCEEDED",
        type: "PURCHASE",
        accountId: userId,
        items: {
          create: skus.map(sku => {
            return {
              sku: {
                connect: {
                  id: sku && sku.id,
                  name: sku && sku.name
                }
              },
              count: 1
            };
          })
        }
      };

      await dataAccess.mutation.createTransaction({ data: transaction });
      // 6. Increment the user's account balance

      let account = await dataAccess.query.creditAccount({
        where: {
          userId
        }
      });

      if (!account) {
        await dataAccess.mutation.createCreditAccount({
          data: {
            userId,
            balance: (skus && skus.length) || 0
          }
        });
        account = await dataAccess.query.creditAccount({
          where: {
            userId
          }
        });
      }

      const updatedBalance = skus.length + ((account && account.balance) || 0);

      await dataAccess.mutation.updateCreditAccount({
        data: {
          userId,
          balance: updatedBalance
        },
        where: {
          userId
        }
      });

      return updatedBalance;
    }
  }
};
