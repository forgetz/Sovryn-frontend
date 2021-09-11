import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import {
  calculateProfit,
  weiToNumberFormat,
  toNumberFormat,
} from 'utils/display-text/format';

import { DummyField } from 'app/components/DummyField';
import { toWei, weiTo18, fromWei } from 'utils/blockchain/math-helpers';
import { AmountInput } from 'app/components/Form/AmountInput';
import { DialogButton } from 'app/components/Form/DialogButton';
import { FormGroup } from 'app/components/Form/FormGroup';
import { AssetsDictionary } from 'utils/dictionaries/assets-dictionary';
import { TradingPairDictionary } from 'utils/dictionaries/trading-pair-dictionary';
import { leverageFromMargin } from 'utils/blockchain/leverage-from-start-margin';
import { LoadableValue } from 'app/components/LoadableValue';
import { translations } from 'locales/i18n';
import { TxType } from 'store/global/transactions-store/types';
import { assetByTokenAddress } from 'utils/blockchain/contract-helpers';
import { gasLimit } from 'utils/classifiers';
import { TxDialog } from 'app/components/Dialogs/TxDialog';
import { Dialog } from 'app/containers/Dialog/Loadable';
import { useCloseWithSwap } from 'app/hooks/protocol/useCloseWithSwap';
import { useAccount } from 'app/hooks/useAccount';
import { useIsAmountWithinLimits } from 'app/hooks/useIsAmountWithinLimits';
import { useMaintenance } from 'app/hooks/useMaintenance';
import { useWeiAmount } from 'app/hooks/useWeiAmount';
import { CollateralAssets } from '../CollateralAssets';
import { AssetRenderer } from 'app/components/AssetRenderer';
import { useCurrentPositionPrice } from 'app/hooks/trading/useCurrentPositionPrice';
import { useSwapsExternal_getSwapExpectedReturn } from 'app/hooks/swap-network/useSwapsExternal_getSwapExpectedReturn';
import { useSlippage } from 'app/pages/BuySovPage/components/BuyForm/useSlippage';
import type { ActiveLoan } from 'types/active-loan';
import { TxFeeCalculator } from '../TxFeeCalculator';

interface IClosePositionDialogProps {
  item: ActiveLoan;
  showModal: boolean;
  onCloseModal: () => void;
  positionSize?: string;
}

const getOptions = (item: ActiveLoan) => {
  if (!item.collateralToken || !item.loanToken) {
    return [];
  }
  return [
    assetByTokenAddress(item.collateralToken),
    assetByTokenAddress(item.loanToken),
  ];
};

export function ClosePositionDialog(props: IClosePositionDialogProps) {
  const receiver = useAccount();

  const [amount, setAmount] = useState<string>('0');
  const [maxTargetAmount, setMaxTargetAmount] = useState('0');
  const [collateral, setCollateral] = useState(
    assetByTokenAddress(props.item.collateralToken),
  );

  const sourceToken = AssetsDictionary.getByTokenContractAddress(
    props.item?.collateralToken || '',
  );
  const targetToken = AssetsDictionary.getByTokenContractAddress(
    props.item?.loanToken || '',
  );

  useEffect(() => {
    setAmount('0');
  }, [props.item.collateral]);

  const options = useMemo(() => getOptions(props.item), [props.item]);
  const isCollateral = useMemo(
    () => collateral === assetByTokenAddress(props.item.collateralToken),
    [collateral, props.item.collateralToken],
  );

  const pair = TradingPairDictionary.findPair(
    sourceToken.asset,
    targetToken.asset,
  );

  const weiAmount = useWeiAmount(amount);

  const { send, ...rest } = useCloseWithSwap(
    props.item.loanId,
    receiver,
    weiAmount,
    isCollateral,
    '0x',
  );

  const handleConfirmSwap = () => {
    send();
  };

  const { t } = useTranslation();
  const { checkMaintenance, States } = useMaintenance();
  const closeTradesLocked = checkMaintenance(States.CLOSE_MARGIN_TRADES);
  const args = [props.item.loanId, receiver, weiAmount, isCollateral, '0x'];
  const isLong = targetToken.asset === pair.longAsset;

  function getEntryPrice(item: ActiveLoan) {
    if (isLong) return Number(weiTo18(item.startRate));
    return 1 / Number(weiTo18(item.startRate));
  }

  const { price: currentPriceSource, loading } = useCurrentPositionPrice(
    sourceToken.asset,
    targetToken.asset,
    weiAmount,
    isLong,
  );

  const startPriceSource = getEntryPrice(props.item);

  const [profit, diff] = calculateProfit(
    isLong,
    currentPriceSource,
    startPriceSource,
    weiAmount,
  );

  const { value: rateByPath } = useSwapsExternal_getSwapExpectedReturn(
    sourceToken.asset,
    targetToken.asset,
    props.item.collateral,
  );

  useEffect(() => {
    setAmount('0');
    setMaxTargetAmount(rateByPath);
  }, [isCollateral, rateByPath]);

  const valid = useIsAmountWithinLimits(
    weiAmount,
    '1',
    isCollateral ? props.item.collateral : maxTargetAmount,
  );

  const totalAmount = Number(amount) + Number(fromWei(profit));
  const { minReturn } = useSlippage(toWei(totalAmount), 0.5);

  return (
    <>
      <Dialog isOpen={props.showModal} onClose={() => props.onCloseModal()}>
        <div className="tw-mw-340 tw-mx-auto">
          <h1 className="tw-text-sov-white tw-text-center">
            {t(translations.closeTradingPositionHandler.title)}
          </h1>

          <div className="tw-py-4 tw-px-4 tw-bg-gray-2 sm:tw--mx-11 tw-mb-4 tw-rounded-lg tw-text-sm tw-font-light">
            <div className="tw-flex tw-flex-row tw-mb-1 tw-justify-start">
              <div className="sm:tw-w-1/3 tw-w-1/2 tw-text-gray-10 sm:tw-ml-12">
                {t(translations.marginTradePage.tradeDialog.pair)}
              </div>
              <div className="tw-text-sov-white tw-w-1/2 tw-ml-12">
                {pair.chartSymbol}
              </div>
            </div>
            <div className="tw-flex tw-flex-row tw-mb-1 tw-justify-start">
              <div className="sm:tw-w-1/3 tw-w-1/2 tw-text-gray-10 sm:tw-ml-12">
                {t(translations.closeTradingPositionHandler.marginType)}
              </div>
              <div
                className={cn('tw-text-sov-white tw-w-1/2 tw-ml-12', {
                  'tw-text-trade-short': targetToken.asset !== pair.longAsset,
                  'tw-text-trade-long': targetToken.asset === pair.longAsset,
                })}
              >
                {leverageFromMargin(props.item.startMargin)}x
              </div>
            </div>
            <div className="tw-flex tw-flex-row tw-mb-1 tw-justify-start">
              <div className="sm:tw-w-1/3 tw-w-1/2 tw-text-gray-10 sm:tw-ml-12">
                {t(translations.closeTradingPositionHandler.positionSize)}
              </div>
              <div className="tw-text-sov-white tw-w-1/2 tw-ml-12">
                {props.positionSize} <AssetRenderer asset={sourceToken.asset} />
              </div>
            </div>
            <div className="tw-flex tw-flex-row tw-justify-start">
              <div className="sm:tw-w-1/3 tw-w-1/2 tw-text-gray-10 sm:tw-ml-12">
                {t(translations.closeTradingPositionHandler.pl)}
              </div>
              <div className="tw-text-sov-white tw-w-1/2 tw-ml-12">
                <LoadableValue
                  loading={loading}
                  value={
                    <span
                      className={
                        diff < 0 ? 'tw-text-trade-short' : 'tw-text-trade-long'
                      }
                    >
                      <div>
                        {diff > 0 && '+'}
                        {weiToNumberFormat(profit, 8)}{' '}
                        <AssetRenderer
                          asset={
                            isCollateral ? sourceToken.asset : targetToken.asset
                          }
                        />
                        {amount !== '0' && (
                          <div>({toNumberFormat(diff * 100, 2)}%)</div>
                        )}
                      </div>
                    </span>
                  }
                />
              </div>
            </div>
          </div>

          <CollateralAssets
            label={t(translations.closeTradingPositionHandler.withdrawIn)}
            value={collateral}
            onChange={value => setCollateral(value)}
            options={options}
          />

          <FormGroup
            label={t(translations.closeTradingPositionHandler.amountToClose)}
            className="tw-mt-7"
          >
            <AmountInput
              value={amount}
              onChange={value => setAmount(value)}
              asset={isCollateral ? sourceToken.asset : targetToken.asset}
              maxAmount={isCollateral ? props.item.collateral : maxTargetAmount}
            />
          </FormGroup>

          <FormGroup
            label={t(translations.closeTradingPositionHandler.amountReceived)}
            className="tw-mt-7"
          >
            <DummyField>{totalAmount}</DummyField>
            <div className="tw-truncate tw-text-xs tw-font-light tw-tracking-normal tw-flex tw-justify-between tw-mt-1">
              <p>
                {t(translations.closeTradingPositionHandler.minimumReceived)}
              </p>
              <div>
                <LoadableValue
                  loading={false}
                  value={weiToNumberFormat(minReturn, 4)}
                  tooltip={weiTo18(minReturn)}
                />{' '}
                {collateral}
              </div>
            </div>
          </FormGroup>

          <TxFeeCalculator
            args={args}
            methodName="closeWithSwap"
            contractName="sovrynProtocol"
            txConfig={{ gas: gasLimit[TxType.CLOSE_WITH_SWAP] }}
          />

          {/* {(closeTradesLocked || test.diff > 5) && (
            <ErrorBadge
              content={
                closeTradesLocked ? (
                  <Trans
                    i18nKey={translations.maintenance.closeMarginTrades}
                    components={[
                      <a
                        href={discordInvite}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="tw-text-warning tw-text-xs tw-underline hover:tw-no-underline"
                      >
                        x
                      </a>,
                    ]}
                  />
                ) : test.diff > 5 ? (
                  <>
                    <p className="tw-mb-1">
                      {t(
                        translations.closeTradingPositionHandler.liquidity
                          .line_1,
                      )}
                    </p>
                    <p className="tw-mb-0">
                      {t(
                        translations.closeTradingPositionHandler.liquidity
                          .line_2,
                      )}
                    </p>
                  </>
                ) : undefined
              }
            />
          )} */}
          <DialogButton
            confirmLabel={t(translations.common.confirm)}
            onConfirm={() => handleConfirmSwap()}
            disabled={rest.loading || !valid || closeTradesLocked}
            cancelLabel={t(translations.common.cancel)}
            onCancel={props.onCloseModal}
          />
        </div>
      </Dialog>
      <TxDialog tx={rest} onUserConfirmed={() => props.onCloseModal()} />
    </>
  );
}

ClosePositionDialog.defaultProps = {
  item: {
    collateral: '0',
  },
};
