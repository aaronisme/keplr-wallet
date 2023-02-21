import {
  AccountSetBase,
  CosmosAccount,
  CosmwasmAccount,
  SecretAccount,
} from "@keplr-wallet/stores";
import { ChainInfo } from "@keplr-wallet/types";

import { FiatOnRampServiceInfo, FiatOnRampServiceInfos } from "../config.ui";
import { useStore } from "../stores";

export interface BuySupportServiceInfo extends FiatOnRampServiceInfo {
  buySupportChainAccounts?: (AccountSetBase &
    CosmosAccount &
    CosmwasmAccount &
    SecretAccount)[];
  buySupportChainInfos?: ChainInfo[];
  buyUrl?: string;
}

export const useBuy = () => {
  const { chainStore, accountStore } = useStore();

  const currentChainId = chainStore.current.chainId;
  const currentChainAccount = accountStore.getAccount(currentChainId);
  const currentChainInfo = chainStore.current;

  const buySupportServiceInfos: BuySupportServiceInfo[] = FiatOnRampServiceInfos.map(
    (serviceInfo) => {
      if (!serviceInfo.buySupportChainIds.includes(currentChainId)) {
        return serviceInfo;
      }

      const buySupportChainAccounts = serviceInfo.buySupportChainIds.map(
        (buySupportChainId) => accountStore.getAccount(buySupportChainId)
      );
      const buySupportChainInfos = serviceInfo.buySupportChainIds.map(
        (buySupportChainId) => chainStore.getChain(buySupportChainId)
      );

      const buyUrlParams = (() => {
        switch (serviceInfo.serviceId) {
          case "moonpay":
            return {
              apiKey: serviceInfo.apiKey,
              showWalletAddressForm: "true",
              ...(currentChainInfo && currentChainAccount
                ? {
                    walletAddress: encodeURIComponent(
                      JSON.stringify({
                        [currentChainInfo.stakeCurrency.coinDenom.toLowerCase()]: currentChainAccount?.bech32Address,
                      })
                    ),
                    currencyCode: currentChainInfo.stakeCurrency.coinDenom.toLowerCase(),
                  }
                : {
                    walletAddresses: encodeURIComponent(
                      JSON.stringify(
                        buySupportChainInfos.reduce((acc, cur) => {
                          const chainAccount = accountStore.getAccount(
                            cur.chainId
                          );
                          return {
                            ...acc,
                            [cur.stakeCurrency.coinDenom.toLowerCase()]: chainAccount.bech32Address,
                          };
                        }, {})
                      )
                    ),
                  }),
            };
          case "transak":
            return {
              apiKey: serviceInfo.apiKey,
              hideMenu: "true",
              ...(currentChainInfo && currentChainAccount
                ? {
                    walletAddress: currentChainAccount.bech32Address ?? "",
                    cryptoCurrencyCode:
                      currentChainInfo.stakeCurrency.coinDenom,
                  }
                : {
                    walletAddressesData: encodeURIComponent(
                      JSON.stringify({
                        coins: buySupportChainInfos.reduce((acc, cur) => {
                          const chainAccount = accountStore.getAccount(
                            cur.chainId
                          );
                          return {
                            ...acc,
                            [cur.stakeCurrency.coinDenom.toLowerCase()]: chainAccount.bech32Address,
                          };
                        }, {}),
                      })
                    ),
                    cryptoCurrencyList: buySupportChainInfos
                      .map((chainInfo) => chainInfo.stakeCurrency.coinDenom)
                      .join(","),
                  }),
            };
          case "kado":
            return {
              apiKey: serviceInfo.apiKey,
              product: "BUY",
              networkList: buySupportChainInfos.map((chainInfo) =>
                chainInfo.chainName.toUpperCase()
              ),
              cryptoList: serviceInfo.buySupportCurrencies?.map(
                (currency) => currency.coinDenom
              ),
              ...(currentChainInfo &&
                currentChainAccount && {
                  onToAddress: currentChainAccount.bech32Address,
                  network: currentChainInfo.chainName.toUpperCase(),
                }),
            };
          default:
            return;
        }
      })();
      const buyUrl = buyUrlParams
        ? `${serviceInfo.buyOrigin}?${Object.entries(buyUrlParams)
            .map((paramKeyValue) => paramKeyValue.join("="))
            .join("&")}`
        : undefined;

      return {
        ...serviceInfo,
        buySupportChainAccounts,
        buySupportChainInfos,
        buyUrl,
      };
    }
  );

  const isSupportChain =
    buySupportServiceInfos.filter((info) =>
      info.buySupportChainIds.includes(chainStore.current.chainId)
    ).length > 0;

  return {
    buySupportServiceInfos,
    isSupportChain,
  };
};
